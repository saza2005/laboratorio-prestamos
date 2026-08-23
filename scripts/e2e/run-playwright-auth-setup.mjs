#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }
const args=process.argv.slice(2)
let role='all'
for(const arg of args){if(arg==='--confirm-e2e')continue;if(arg.startsWith('--role=')){role=arg.slice(7);continue}fail('unknown_argument')}
if(!args.includes('--confirm-e2e'))fail('missing_confirm_e2e')
const allowed=['admin','lab_staff','teacher','student','all']
if(!allowed.includes(role))fail('invalid_role')
const safe={...process.env}
delete safe.SUPABASE_SERVICE_ROLE_KEY
delete safe.NODE_OPTIONS
for(const key of Object.keys(safe)) if(/E2E_.*_(CONFIRM|TOKEN|SESSION)/i.test(key)) delete safe[key]
const guard=spawnSync(process.execPath,['scripts/e2e/verify-playwright-auth-environment.mjs','--confirm-e2e'],{stdio:'inherit',env:safe})
if(guard.status!==0)process.exit(guard.status??1)
const baseline=spawnSync(process.execPath,['scripts/e2e/verify-baseline.mjs','--confirm-e2e'],{stdio:'inherit',env:{...process.env,NODE_OPTIONS:undefined}})
if(baseline.status!==0)process.exit(baseline.status??1)
const roles=role==='all'?['admin','lab_staff','teacher','student']:[role]
const projectByRole={admin:'auth-admin',lab_staff:'auth-lab-staff',teacher:'auth-teacher',student:'auth-student'}
for(const item of roles){const result=spawnSync('node_modules/.bin/playwright',['test','tests/e2e/auth.setup.ts','--project='+projectByRole[item]],{stdio:'inherit',env:safe});if(result.status!==0)process.exit(result.status??1)}
process.exit(0)
function fail(code){console.error('PLAYWRIGHT_AUTH_SETUP: FAIL ('+code+')');process.exit(2)}
