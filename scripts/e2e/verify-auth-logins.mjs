#!/usr/bin/env node
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const args=new Set(process.argv.slice(2))
for (const arg of args) if (arg !== '--confirm-e2e') fail('unknown_argument')
if (!args.has('--confirm-e2e')) fail('missing_confirm_e2e')
const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','E2E_EXPECTED_PROJECT_REF','E2E_ADMIN_EMAIL','E2E_ADMIN_PASSWORD','E2E_LAB_STAFF_EMAIL','E2E_LAB_STAFF_PASSWORD','E2E_TEACHER_EMAIL','E2E_TEACHER_PASSWORD','E2E_STUDENT_EMAIL','E2E_STUDENT_PASSWORD']
const values=Object.fromEntries(keys.map(k=>[k,process.env[k]??'']))
const raw=fs.readFileSync('.env.e2e','utf8')
const rawWhitespace=keys.some(k=>new RegExp('^'+k+'=(.*)$','m').exec(raw)?.[1]?.trim() !== new RegExp('^'+k+'=(.*)$','m').exec(raw)?.[1])
if (Object.values(values).some(v=>!v.trim()) || rawWhitespace) fail('invalid_environment_values')
let ref
try { const u=new URL(values.NEXT_PUBLIC_SUPABASE_URL); if (u.protocol!=='https:' || !u.hostname.endsWith('.supabase.co')) fail('invalid_supabase_url'); ref=u.hostname.split('.')[0] } catch { fail('invalid_supabase_url') }
if (ref !== values.E2E_EXPECTED_PROJECT_REF) fail('project_mismatch')
const aliases=[
  ['e2e_admin','E2E_ADMIN_EMAIL','E2E_ADMIN_PASSWORD'],
  ['e2e_lab_staff','E2E_LAB_STAFF_EMAIL','E2E_LAB_STAFF_PASSWORD'],
  ['e2e_teacher','E2E_TEACHER_EMAIL','E2E_TEACHER_PASSWORD'],
  ['e2e_student','E2E_STUDENT_EMAIL','E2E_STUDENT_PASSWORD'],
]
const emails=aliases.map(([,e])=>values[e].trim().toLowerCase())
const passwords=aliases.map(([, ,p])=>values[p])
if (new Set(emails).size!==4 || new Set(passwords).size!==4) fail('duplicate_credentials')
const authState=JSON.parse(fs.readFileSync('.e2e-state/auth-users.json','utf8'))
const profileState=JSON.parse(fs.readFileSync('.e2e-state/profiles.json','utf8'))
if (authState.projectRef!==values.E2E_EXPECTED_PROJECT_REF || profileState.projectRef!==values.E2E_EXPECTED_PROJECT_REF) fail('state_project_mismatch')
const admin=createClient(values.NEXT_PUBLIC_SUPABASE_URL,values.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
const listed=await admin.auth.admin.listUsers({page:1,perPage:1000})
if (listed.error) fail('auth_admin_read_failed')
const users=listed.data.users??[]
const rows=[]
for (const [alias,email,passwordKey] of aliases.map(([a,e,p])=>[a,values[e],p])) {
  const expected=authState.users?.[alias]
  const user=users.find(u=>u.email?.trim().toLowerCase()===email.trim().toLowerCase())
  const profileId=profileState.profiles?.[alias]?.id
  const profileQuery=profileId?await read(admin.from('profiles').select('id,role,is_active').eq('id',profileId).maybeSingle()):{ok:false,row:null}
  const found=Boolean(user)
  const confirmed=Boolean(user?.email_confirmed_at)
  const disabled=Boolean(user?.banned_until && new Date(user.banned_until)>new Date())
  const metadata=user?.user_metadata?.e2e_test===true && user?.user_metadata?.e2e_alias===alias
  const identity=Boolean(user&&expected&&user.id===expected.id&&profileQuery.row?.id===user.id&&profileQuery.row?.is_active===true)
  let login='FAIL',category='none',errorCode=''
  let logout='PASS'
  if (found && confirmed && !disabled && metadata && identity) {
    const client=createClient(values.NEXT_PUBLIC_SUPABASE_URL,values.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    const result=await client.auth.signInWithPassword({email:email.trim(),password:values[passwordKey]})
    if (!result.error && result.data.user?.id===user.id) login='PASS'
    else { category=classify(result.error); errorCode=result.error?.code??'' }
    const signedOut=await client.auth.signOut({scope:'local'})
    logout=signedOut.error?'FAIL':'PASS'
  } else if (!found) category='user_not_found'
  else if (!confirmed) category='email_not_confirmed'
  else if (disabled) category='user_disabled'
  else if (!identity) category='unexpected_error'
  rows.push({alias,user_found:found,email_confirmed:confirmed,login,category,error_code:errorCode,user_matches:identity,logout})
}
for (const row of rows) console.log([row.alias,'user_found='+yesNo(row.user_found),'email_confirmed='+yesNo(row.email_confirmed),'login='+row.login,'category='+row.category,'code='+(row.error_code||'none'),'user_matches='+yesNo(row.user_matches),'logout='+row.logout].join(' '))
const failed=rows.some(r=>r.login!=='PASS'||r.logout!=='PASS'||!r.user_found||!r.user_matches)
console.log('AUTH_LOGIN_RESULT: '+(failed?'FAIL':'PASS'))
process.exit(failed?1:0)
async function read(q){const {data,error}=await q;return{ok:!error,row:data??null}}
function classify(error){if(!error)return'unexpected_error';const status=error.status??error.statusCode;if(status===429)return'rate_limited';const text=String(error.code??'')+' '+String(error.name??'')+' '+String(error.message??'').toLowerCase();if(text.includes('invalid')&&text.includes('credential'))return'invalid_credentials';if(text.includes('not confirmed'))return'email_not_confirmed';if(text.includes('disabled')||text.includes('banned'))return'user_disabled';if(text.includes('network')||text.includes('fetch'))return'network_error';return'unexpected_error'}
function yesNo(v){return v?'yes':'no'}
function fail(code){console.error('AUTH_LOGIN_DIAGNOSTIC: FAIL ('+code+')');process.exit(2)}
