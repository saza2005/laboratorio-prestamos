#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const testArg = args.find(arg => arg.startsWith('--test='))
const allowed = {
  'ROLE-01': {
    project: 'chromium-auth-ephemeral',
    file: 'tests/roles/access.spec.ts',
    email: 'E2E_ADMIN_EMAIL',
    password: 'E2E_ADMIN_PASSWORD',
    grep: 'admin: acceso a módulos administrativos.*puede iniciar sesión y abrir sus rutas principales',
  },
  'ROLE-02': {
    project: 'chromium-auth-ephemeral',
    file: 'tests/roles/access.spec.ts',
    email: 'E2E_LAB_STAFF_EMAIL',
    password: 'E2E_LAB_STAFF_PASSWORD',
    grep: 'lab_staff: acceso a módulos administrativos.*puede iniciar sesión y abrir sus rutas principales',
  },
}
if (!args.includes('--confirm-e2e')) fail('missing_confirm_e2e')
if (!testArg || !allowed[testArg.slice('--test='.length)]) fail('test_not_allowed')
for (const arg of args) {
  if (arg === '--confirm-e2e' || arg === '--list' || arg === testArg) continue
  fail('argument_not_allowed')
}
const testId = testArg.slice('--test='.length)
const config = allowed[testId]
const expected = (process.env.E2E_EXPECTED_PROJECT_REF || '').trim()
if (!expected) fail('missing_expected_project_ref')
const email = process.env[config.email]
const password = process.env[config.password]
if (!email || !password) fail('missing_selected_credentials')
const childEnv = {}
for (const key of ['PATH','HOME','USER','SHELL','TMPDIR','TMP','TEMP','FORCE_COLOR','NO_COLOR']) {
  if (process.env[key]) childEnv[key] = process.env[key]
}
childEnv.E2E_EXPECTED_PROJECT_REF = expected
childEnv[config.email] = email
childEnv[config.password] = password
const forbidden = Object.keys(childEnv).filter(key =>
  /(SUPABASE_SERVICE_ROLE_KEY|E2E_.*_(PASSWORD|EMAIL|CONFIRM|TOKEN|SESSION)|ACCESS_TOKEN|REFRESH_TOKEN)/i.test(key) && key !== config.email && key !== config.password,
)
if (forbidden.length) fail('forbidden_child_environment')
console.log('AUTH_ONLY_RUNNER_ENVIRONMENT: PASS')
console.log('AUTH_CREDENTIALS_TO_PLAYWRIGHT: selected-role-only')
console.log('AUTH_CREDENTIALS_TO_NEXT: 0')
console.log('SERVICE_ROLE_TO_PLAYWRIGHT: no')
console.log('SERVICE_ROLE_TO_NEXT: no')
console.log('EPHEMERAL_STORAGE_STATE: none')
const playwrightArgs = [
  'node_modules/.bin/playwright', 'test',
  '--project=' + config.project,
  '--grep=' + config.grep,
  config.file,
]
if (args.includes('--list')) playwrightArgs.splice(2, 0, '--list')
const result = spawnSync(process.execPath, playwrightArgs, { env: childEnv, stdio: 'inherit' })
if (result.error) fail('playwright_launch_failed')
process.exit(result.status ?? 1)
function fail(code) {
  console.error('AUTH_ONLY_RUNNER_ENVIRONMENT: FAIL (' + code + ')')
  process.exit(1)
}
