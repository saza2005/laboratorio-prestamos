#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
const args=new Set(process.argv.slice(2))
for(const arg of args) if(arg!=='--confirm-e2e') fail('unknown_argument')
if(!args.has('--confirm-e2e')) fail('missing_confirm_e2e')
const keys=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','E2E_EXPECTED_PROJECT_REF','E2E_ADMIN_EMAIL','E2E_ADMIN_PASSWORD','E2E_LAB_STAFF_EMAIL','E2E_LAB_STAFF_PASSWORD','E2E_TEACHER_EMAIL','E2E_TEACHER_PASSWORD','E2E_STUDENT_EMAIL','E2E_STUDENT_PASSWORD']
const env=Object.fromEntries(keys.map(k=>[k,(process.env[k]??'').trim()]))
if(Object.values(env).some(v=>!v)) fail('missing_configuration')
let ref
try{const u=new URL(env.NEXT_PUBLIC_SUPABASE_URL);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co'))fail('invalid_url');ref=u.hostname.split('.')[0]}catch{fail('invalid_url')}
if(ref!==env.E2E_EXPECTED_PROJECT_REF)fail('project_mismatch')
const emails=['E2E_ADMIN_EMAIL','E2E_LAB_STAFF_EMAIL','E2E_TEACHER_EMAIL','E2E_STUDENT_EMAIL'].map(k=>env[k].toLowerCase())
const passwords=['E2E_ADMIN_PASSWORD','E2E_LAB_STAFF_PASSWORD','E2E_TEACHER_PASSWORD','E2E_STUDENT_PASSWORD'].map(k=>env[k])
if(new Set(emails).size!==4||new Set(passwords).size!==4)fail('duplicate_credentials')
const raw=fs.readFileSync('.env.e2e','utf8')
for(const key of ['E2E_ADMIN_EMAIL','E2E_ADMIN_PASSWORD','E2E_LAB_STAFF_EMAIL','E2E_LAB_STAFF_PASSWORD','E2E_TEACHER_EMAIL','E2E_TEACHER_PASSWORD','E2E_STUDENT_EMAIL','E2E_STUDENT_PASSWORD']){const line=raw.split('\n').find(x=>x.startsWith(key+'='));if(!line)fail('missing_raw_variable');const rhs=line.slice(key.length+1);if(!rhs.startsWith('"')||!rhs.endsWith('"'))fail('env_not_normalized');try{if(JSON.parse(rhs)!==process.env[key])fail('raw_parsed_mismatch')}catch{fail('env_parse_mismatch')}}
const stateDir='.e2e-state/playwright'
if(!fs.existsSync(stateDir)||spawnSync('git',['check-ignore','-q',stateDir+'/admin.json']).status!==0)fail('storage_path_not_ignored')
for(const role of ['admin','lab-staff','teacher','student']) { const stateFile=path.join(stateDir,role+'.json'); if(!fs.existsSync(stateFile)) continue; if((fs.statSync(stateFile).mode&0o777)!==0o600) fail('state_permissions'); if(spawnSync('git',['check-ignore','-q',stateFile]).status!==0) fail('state_not_ignored'); try { const parsed=JSON.parse(fs.readFileSync(stateFile,'utf8')); if(!parsed||typeof parsed!=='object') fail('state_invalid_json') } catch { fail('state_invalid_json') } }
const tests=fs.readdirSync('tests',{withFileTypes:true}).flatMap(e=>e.isDirectory()?[]:[])
const testText=fs.existsSync('tests/e2e/auth.setup.ts')?fs.readFileSync('tests/e2e/auth.setup.ts','utf8'):''
if(/@[^\s]+\.[A-Za-z]{2,}|[0-9a-f]{8}-[0-9a-f-]{27,}/i.test(testText))fail('hardcoded_credential')
console.log('PLAYWRIGHT_AUTH_ENVIRONMENT: PASS')
console.log('PROJECT_REF_MATCH: PASS')
console.log('STORAGE_PATHS: READY_AND_IGNORED')
console.log('STORAGE_STATES_EXISTING: '+['admin','lab-staff','teacher','student'].filter(role=>fs.existsSync(path.join(stateDir,role+'.json'))).length)
function fail(code){console.error('PLAYWRIGHT_AUTH_ENVIRONMENT: FAIL ('+code+')');process.exit(1)}
