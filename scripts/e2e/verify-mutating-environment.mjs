import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { loadState } from './lib/mutating-state.mjs'
import { findMutatingNamespace, projectRefFromUrl } from './lib/mutating-remote.mjs'
function fail(code) { console.error('MUTATING_ENVIRONMENT: FAIL'); console.error('CATEGORY: ' + code); process.exit(1) }
const args = process.argv.slice(2)
if (!args.includes('--confirm-e2e')) fail('missing_confirm_e2e')
if (args.some((arg) => !['--confirm-e2e','--flow=FLOW-R1','--flow=FLOW-R2','--flow=FLOW-R3'].includes(arg))) fail('unknown_argument')
if (process.env.E2E_MUTATING_CONFIRM !== 'FLOW-R1-CLEANUP') fail('missing_mutating_confirmation')
const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
const expected = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
if (!url || !expected || projectRefFromUrl(url) !== expected) fail('project_mismatch')
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) fail('missing_e2e_environment')
const appEnvPath = path.resolve('.env.app-e2e')
if (!fs.existsSync(appEnvPath)) fail('missing_app_environment')
const appEnv = fs.readFileSync(appEnvPath, 'utf8')
if (!/NEXT_PUBLIC_SUPABASE_URL\s*=/.test(appEnv) || !/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=/.test(appEnv)) fail('invalid_app_environment')
if (/(PASSWORD|SERVICE_ROLE|SECRET|ACCESS_TOKEN|REFRESH_TOKEN)/i.test(appEnv)) fail('secret_in_app_environment')
const appUrlLine = appEnv.split('\n').find((line) => line.trim().startsWith('NEXT_PUBLIC_SUPABASE_URL='))
const appUrl = appUrlLine?.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')
if (!appUrl || projectRefFromUrl(appUrl) !== expected) fail('app_project_mismatch')
let state
try { state = loadState() } catch { fail('invalid_mutating_state') }
if (state.active_flow !== null || Object.keys(state.flows).length) fail('pending_mutating_state')
try {
  execFileSync(process.execPath, ['scripts/e2e/verify-baseline.mjs','--confirm-e2e'], { stdio: 'ignore', env: process.env })
  execFileSync(process.execPath, ['scripts/e2e/verify-storage-states.mjs','--confirm-e2e'], { stdio: 'ignore', env: process.env })
  if ((await findMutatingNamespace()).length) fail('mutating_residuals_present')
} catch { fail('preflight_or_remote_read_failed') }
console.log('MUTATING_ENVIRONMENT: PASS')
console.log('MUTATING_EXECUTION_CONFIRMATION: PASS')
console.log('UNTRACKED_WRITE_WINDOW: 0')
console.log('REMOTE_WRITES: 0')
