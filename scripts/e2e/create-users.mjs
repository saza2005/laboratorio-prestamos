#!/usr/bin/env node
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
const users = [
  ['e2e_admin','E2E_ADMIN_EMAIL','E2E_ADMIN_PASSWORD'],
  ['e2e_lab_staff','E2E_LAB_STAFF_EMAIL','E2E_LAB_STAFF_PASSWORD'],
  ['e2e_teacher','E2E_TEACHER_EMAIL','E2E_TEACHER_PASSWORD'],
  ['e2e_student','E2E_STUDENT_EMAIL','E2E_STUDENT_PASSWORD'],
]
const args = new Set(process.argv.slice(2)); const allowed = new Set(['--dry-run','--execute','--confirm-e2e'])
for (const arg of args) if (!allowed.has(arg)) fail('unknown_argument')
if (!args.has('--confirm-e2e')) fail('missing_confirm_e2e')
if (args.has('--dry-run') === args.has('--execute')) fail('choose_one_mode')
const env = loadEnv(); validate(env)
const client = createClient(env.url, env.serviceKey, { auth: { autoRefreshToken:false, persistSession:false, detectSessionInUrl:false } })
const existing = await listUsers(client)
const results = users.map(([alias,emailKey]) => { const email=env[emailKey].toLowerCase(); const found=existing.find(u => u.email?.toLowerCase()===email); if (!found) return {alias,email,status:'WOULD_CREATE'}; const m=found.user_metadata??{}; return {alias,email,status:m.e2e_test===true&&m.e2e_alias===alias?'ALREADY_EXISTS_MATCHING_EMAIL':'CONFLICT_EXISTING_EMAIL'} })
for (const r of results) console.log(r.alias+': '+r.status+' ('+mask(r.email)+')')
if (results.some(r=>r.status==='CONFLICT_EXISTING_EMAIL')) fail('conflicting_existing_email')
if (args.has('--dry-run')) { console.log('mode: dry-run; writes: 0; state_file: not_created'); process.exit(0) }
if (process.env.E2E_USER_CREATION_CONFIRM!=='CREATE_E2E_AUTH_USERS') fail('missing_creation_confirmation')
const created=[]
for (const [alias,emailKey,passwordKey] of users) { const prior=results.find(r=>r.alias===alias); if(prior.status==='ALREADY_EXISTS_MATCHING_EMAIL') continue; const {data,error}=await client.auth.admin.createUser({email:env[emailKey],password:env[passwordKey],email_confirm:true,user_metadata:{e2e_test:true,e2e_alias:alias}}); if(error||!data.user?.id) fail('create_failed_'+alias); created.push({alias,id:data.user.id,email:env[emailKey].toLowerCase()}); await writeState(env.expectedRef,created); console.log(alias+': CREATED ('+mask(env[emailKey])+')') }
console.log('mode: execute; state_file: written_without_secrets')
function loadEnv(){ const keys=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','E2E_EXPECTED_PROJECT_REF',...users.flatMap(([,e,p])=>[e,p])]; const o=Object.fromEntries(keys.map(k=>[k,(process.env[k]??'').trim()])); o.url=o.NEXT_PUBLIC_SUPABASE_URL; o.serviceKey=o.SUPABASE_SERVICE_ROLE_KEY; o.expectedRef=o.E2E_EXPECTED_PROJECT_REF; return o }
// These E2E accounts use email/password authentication. The institutional domain rule belongs to Google OAuth and does not apply here.
function validate(v){ for(const [k,x] of Object.entries(v)) if(!['url','serviceKey','expectedRef'].includes(k)&&!x) fail('missing_'+k); let u; try{u=new URL(v.url)}catch{fail('invalid_url')} if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')) fail('invalid_supabase_url'); if(u.hostname.split('.')[0]!==v.expectedRef) fail('url_ref_mismatch'); let linked=''; try{linked=fsSync.readFileSync(path.join(process.cwd(),'tests/supabase-e2e-db/supabase/.temp/project-ref'),'utf8').trim()}catch{fail('linked_ref_unavailable')} if(linked!==v.expectedRef) fail('linked_ref_mismatch'); const emails=users.map(([,e])=>v[e].toLowerCase()); if(new Set(emails).size!==emails.length) fail('duplicate_emails'); for(const e of emails) if(!/^[^\s@]+@gmail\.com$/.test(e)) fail('invalid_e2e_email'); const passwords=users.map(([, ,p])=>v[p]); if(new Set(passwords).size!==passwords.length) fail('duplicate_passwords'); for(const [a,e,p] of users) if(v[p].length<12||v[p]===v[e]) fail('weak_password_'+a) }
async function listUsers(c){const all=[];let page=1;while(true){const {data,error}=await c.auth.admin.listUsers({page,perPage:1000});if(error)fail('list_users_failed');all.push(...(data.users??[]));if(!data.users||data.users.length<1000)return all;page++}}
async function writeState(ref,created){const d=path.join(process.cwd(),'.e2e-state'),target=path.join(d,'auth-users.json'),tmp=target+'.tmp';await fs.mkdir(d,{recursive:true,mode:0o700});await fs.writeFile(tmp,JSON.stringify({projectRef:ref,createdAt:new Date().toISOString(),users:Object.fromEntries(created.map(x=>[x.alias,{id:x.id,email:x.email}]))},null,2)+'\n',{mode:0o600});await fs.rename(tmp,target)}
function mask(e){const [l,d]=e.split('@');return l.slice(0,2)+'***@'+d}
function fail(code){console.error('ERROR: '+code);process.exit(1)}
