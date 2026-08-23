#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
const args=new Set(process.argv.slice(2))
for(const arg of args) if(!['--confirm-e2e','--allow-missing'].includes(arg)) fail('unknown_argument')
if(!args.has('--confirm-e2e'))fail('missing_confirm_e2e')
const allow=args.has('--allow-missing')
const dir='.e2e-state/playwright'
const files=['admin.json','lab-staff.json','teacher.json','student.json'].map(f=>path.join(dir,f))
const missing=files.filter(f=>!fs.existsSync(f))
if(missing.length===4&&allow){console.log('STORAGE_STATES: NOT_GENERATED');process.exit(0)}
if(missing.length)fail('missing_state')
for(const file of files){if((fs.statSync(file).mode&0o777)!==0o600)fail('unsafe_permissions');if(spawnSync('git',['check-ignore','-q',file]).status!==0)fail('state_not_ignored');let data;try{data=JSON.parse(fs.readFileSync(file,'utf8'))}catch{fail('invalid_json')}if(!data||!Array.isArray(data.cookies)||!Array.isArray(data.origins))fail('invalid_storage_shape');const serialized=JSON.stringify(data);if(/password|service_role|refresh_token|access_token|E2E_[A-Z0-9_]+_(EMAIL|PASSWORD)/i.test(serialized))fail('sensitive_text_in_state');if(data.cookies.some(c=>!String(c.domain).includes('localhost')&&!String(c.domain).includes('supabase.co')))fail('unexpected_cookie_domain')}
console.log('STORAGE_STATES: PASS')
function fail(code){console.error('STORAGE_STATES: FAIL ('+code+')');process.exit(1)}
