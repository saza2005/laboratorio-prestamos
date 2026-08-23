import { execFileSync, spawnSync } from 'node:child_process'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R2') || !args.has('--execute')) fail('missing_arguments')
if (process.env.E2E_MUTATING_CONFIRM !== 'FLOW-R2-REJECT') fail('invalid_mutating_confirmation')
try {
  execFileSync(process.execPath, ['scripts/e2e/verify-mutating-flow-r2.mjs', '--confirm-e2e', '--flow=FLOW-R2', '--stage=seeded'], { stdio: 'inherit', env: process.env })
} catch { fail('seeded_verifier_failed') }
const childEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  E2E_EXPECTED_PROJECT_REF: process.env.E2E_EXPECTED_PROJECT_REF,
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL,
}
const result = spawnSync('npx', ['playwright', 'test', 'tests/e2e/mutating/request-reject.spec.ts', '--project=chromium-admin', '--no-deps', '--retries=0', '--workers=1'], { env: childEnv, stdio: 'inherit' })
if (result.status !== 0) fail('playwright_flow_failed')
console.log('FLOW_R2_REJECT_WRITE_ATTEMPTED: yes')
console.log('REJECT_CONFIRM_COUNT: 1')
console.log('REMOTE_WRITES: 1_RPC_UPDATE')

function fail(code) {
  console.error('MUTATING_RUNNER: FAIL')
  console.error('CATEGORY: ' + code)
  process.exit(1)
}
