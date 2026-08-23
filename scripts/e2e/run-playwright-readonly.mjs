#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const allowedProjects = new Set([
  'chromium-admin',
  'chromium-lab-staff',
  'chromium-teacher',
  'chromium-student',
])
const allowedPaths = new Set([
  'tests/public/pages.spec.ts',
  'tests/auth/login.spec.ts',
  'tests/e2e/smoke.readonly.spec.ts',
  'tests/e2e/read-only/student-search-change-003.spec.ts',
  'tests/e2e/read-only/change-004-analytics.spec.ts',
  'tests/e2e/read-only/change-004-analytics-completion.spec.ts',
  'tests/e2e/read-only/change-005-ui-regression.spec.ts',
  'tests/e2e/mutating/request-create.ui-contract.spec.ts',
  'tests/e2e/mutating/request-create-r4-b2.ui-rehearsal.spec.ts',
  'tests/e2e/mutating/request-create-r4-c.boundary.spec.ts',
  'tests/e2e/mutating/request-reject.ui-contract.spec.ts',
  'tests/e2e/mutating/request-create.ui-state-machine.spec.ts',
  'tests/e2e/mutating/runner-runtime-smoke.spec.ts',
  'tests/e2e/mutating/request-reject.browser-armed.spec.ts',
  'tests/e2e/mutating/request-reject.click-boundary-diagnostic.spec.ts',
  'tests/unit/email-policy.spec.ts',
  'tests/unit/roles.spec.ts',
])

if (!args.includes('--confirm-e2e')) fail('missing_confirm_e2e')

for (const arg of args) {
  if (arg === '--confirm-e2e' || arg === '--no-deps' || arg === '--list' || arg === '--retries=0') continue
  if (arg.startsWith('--grep=')) {
    const pattern = arg.slice('--grep='.length)
    if (pattern !== 'muestra los mensajes de seguridad del acceso institucional|muestra un error controlado con credenciales vacías') fail('grep_not_allowed')
    continue
  }
  if (arg.startsWith('--project=')) {
    if (!allowedProjects.has(arg.slice('--project='.length))) fail('project_not_allowed')
    continue
  }
  if (allowedPaths.has(arg)) continue
  fail('argument_not_allowed')
}

const unitOnly = args.filter(arg => arg.endsWith('.spec.ts')).every(arg => arg.startsWith('tests/unit/'))
const expected = (process.env.E2E_EXPECTED_PROJECT_REF || '').trim()
if (!expected) fail('missing_expected_project_ref')

const childEnv = {}
for (const key of ['PATH', 'HOME', 'USER', 'SHELL', 'TMPDIR', 'TMP', 'TEMP', 'FORCE_COLOR', 'NO_COLOR']) {
  if (process.env[key]) childEnv[key] = process.env[key]
}
for (const key of ['PLAYWRIGHT_NO_SERVER', 'PLAYWRIGHT_BASE_URL']) {
  if (process.env[key]) childEnv[key] = process.env[key]
}
childEnv.E2E_EXPECTED_PROJECT_REF = expected
if (unitOnly) childEnv.PLAYWRIGHT_NO_SERVER = '1'

const forbidden = Object.keys(childEnv).filter(key =>
  /(SUPABASE_SERVICE_ROLE_KEY|E2E_.*_(PASSWORD|EMAIL|CONFIRM|TOKEN|SESSION)|ACCESS_TOKEN|REFRESH_TOKEN)/i.test(key),
)
if (forbidden.length) fail('forbidden_child_environment')

console.log('READONLY_RUNNER_ENVIRONMENT: PASS')
console.log('E2E_EXPECTED_PROJECT_REF_AVAILABLE_TO_WEBSERVER: yes')

const result = spawnSync(
  process.execPath,
  ['node_modules/.bin/playwright', 'test', ...args.filter(arg => arg !== '--confirm-e2e')],
  { env: childEnv, stdio: 'inherit' },
)

if (result.error) fail('playwright_launch_failed')
process.exit(result.status ?? 1)

function fail(code) {
  console.error(`READONLY_RUNNER_ENVIRONMENT: FAIL (${code})`)
  process.exit(1)
}
