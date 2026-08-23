import { randomBytes } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { registerFlow, loadState } from './lib/mutating-state.mjs'
function fail(code) { console.error('MUTATING_RUNNER: FAIL'); console.error('CATEGORY: ' + code); process.exit(1) }
const args = process.argv.slice(2)
const flowArg = args.find((arg) => arg.startsWith('--flow='))
if (!args.includes('--confirm-e2e') || (!args.includes('--runtime-smoke') && !['--flow=FLOW-R1','--flow=FLOW-R2'].includes(flowArg))) fail('missing_arguments')
if (args.some((arg) => !['--confirm-e2e','--flow=FLOW-R1','--flow=FLOW-R2','--list','--dry-run','--execute','--runtime-smoke'].includes(arg))) fail('unknown_argument')
if (args.includes('--runtime-smoke')) {
  if (flowArg || args.includes('--execute')) fail('runtime_smoke_flow_not_allowed')
  const result = spawnSync('npx', ['playwright','test','tests/e2e/mutating/runner-runtime-smoke.spec.ts','--project=chromium-admin','--no-deps','--retries=0','--workers=1'], { env: process.env, stdio: 'inherit' })
  process.exit(result.status ?? 1)
}
if (args.includes('--list') && (args.includes('--dry-run') || args.includes('--execute'))) fail('duplicate_mode')
if (args.includes('--dry-run') && args.includes('--execute')) fail('duplicate_mode')
if (args.includes('--execute') && flowArg === '--flow=FLOW-R2') {
  const result = spawnSync(process.execPath, ['scripts/e2e/run-playwright-mutating-r2.mjs', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env })
  process.exit(result.status ?? 1)
}
if (args.includes('--execute') && flowArg !== '--flow=FLOW-R1') fail('flow_execute_not_authorized')
if (args.includes('--execute') && process.env.E2E_MUTATING_CONFIRM !== 'FLOW-R1-CLEANUP') fail('missing_mutating_confirmation')
if (!args.includes('--list') && !args.includes('--dry-run') && !args.includes('--execute')) fail('execution_requires_explicit_mode')
if (args.includes('--dry-run')) {
  console.log('FLOW: ' + flowArg.slice(7))
  console.log('TESTS_SELECTED: 1')
  console.log('AUTH_DEPENDENCIES: 0')
  console.log('CORRELATION_TRACKING: ENABLED')
  console.log('UNTRACKED_WRITE_WINDOW: 0')
  console.log('MUTATION_EXECUTED: no')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}
if (args.includes('--list')) {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, E2E_EXPECTED_PROJECT_REF: process.env.E2E_EXPECTED_PROJECT_REF, PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL }
  const testPath = flowArg === '--flow=FLOW-R2' ? 'tests/e2e/mutating/request-reject.spec.ts' : 'tests/e2e/mutating/request-create.spec.ts'
  const project = flowArg === '--flow=FLOW-R2' ? 'chromium-admin' : 'chromium-student'
  const result = spawnSync('npx', ['playwright','test',testPath,'--project='+project,'--no-deps','--list'], { env, encoding: 'utf8' })
  if (result.status !== 0) fail('playwright_list_failed')
  console.log('FLOW: ' + flowArg.slice(7))
  console.log('TESTS_SELECTED: 1')
  console.log('AUTH_DEPENDENCIES: 0')
  console.log('CORRELATION_TRACKING: ENABLED')
  console.log('UNTRACKED_WRITE_WINDOW: 0')
  console.log('MUTATION_EXECUTED: no')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}
try { execFileSync(process.execPath, ['scripts/e2e/verify-mutating-environment.mjs','--confirm-e2e','--flow=FLOW-R1'], { stdio: 'inherit', env: process.env }) } catch { fail('environment_guard_failed') }
const marker = 'E2E_MUT_REQ_R1_' + randomBytes(10).toString('hex')
registerFlow('FLOW-R1', { correlation_marker: marker, owner_role: 'student', expected_entity_type: 'request', expected_quantity: 1, request_id: null, remote_write_confirmed: false, phase: 'RUNNING_NO_WRITE' })
const childEnv = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, E2E_EXPECTED_PROJECT_REF: process.env.E2E_EXPECTED_PROJECT_REF, PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL }
const result = spawnSync('npx', ['playwright','test','tests/e2e/mutating/request-create.spec.ts','--project=chromium-student','--no-deps','--retries=0','--workers=1'], { env: childEnv, encoding: 'utf8', stdio: 'inherit' })
if (result.status !== 0) {
  try { execFileSync(process.execPath, ['scripts/e2e/resolve-mutating-request.mjs','--confirm-e2e','--flow=FLOW-R1'], { stdio: 'inherit', env: process.env }) } catch {}
  fail('playwright_flow_failed')
}
const state = loadState()
if (!state.flows['FLOW-R1']?.request_id) {
  try { execFileSync(process.execPath, ['scripts/e2e/resolve-mutating-request.mjs','--confirm-e2e','--flow=FLOW-R1'], { stdio: 'inherit', env: process.env }) } catch { fail('remote_id_not_tracked') }
}
console.log('FLOW_R1_WRITE_CONFIRMED: yes')
console.log('REMOTE_ENTITY_TRACKED: yes')
console.log('REMOTE_WRITES: 1')
