import crypto from 'node:crypto'
import fs from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import path from 'node:path'
import { atomicWriteHandshake, ensureRuntimeDir, makeRunId, readHandshake } from './lib/runtime-handshake.mjs'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--execute-b-delivery')) fail('explicit_l1_delivery_authorization_required')
if (process.cwd() !== path.resolve('/home/saza/Proyectos/laboratorio-prestamos-e2e')) fail('wrong_project_workdir')

try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }
const expectedRef = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
const publicUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
if (!expectedRef || !publicUrl) fail('missing_e2e_project_identity')
if (!publicUrl.startsWith(`https://${expectedRef}.supabase.co`)) fail('e2e_project_identity_mismatch')

const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
const initial = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
for (const key of ['requestCreateAttempt', 'approvalAttempt', 'deliveryAttempt', 'cleanupAttempt']) {
  if (initial[key] !== 0) fail('tracker_not_pristine_' + key)
}
if (initial.fixtureReady === true || initial.requestId || initial.requestItemId || initial.ownershipToken) fail('active_fixture_prestate')

const runId = makeRunId()
ensureRuntimeDir()
const eventPath = path.resolve(`.e2e-state/runtime/${runId}.delivery.json`)
const capturePath = path.resolve(`.e2e-state/runtime/${runId}.l1-posts.json`)
const childEnv = makeBrowserEnvironment(runId, capturePath)
if (!Object.hasOwn(childEnv, 'RESEND_API_KEY') || childEnv.RESEND_API_KEY !== '') fail('email_provider_sanitization_failed')
console.log('EMAIL_PROVIDER_DISABLED_PROVEN')
atomicWriteHandshake({ version: 1, project: 'e2e', run_id: runId, state: 'BROWSER_STARTING' })
writeEvent('BROWSER_READY', true)

const child = spawn('npx', [
  'playwright', 'test', 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts',
  '--project=chromium-lab-staff', '--no-deps', '--retries=0', '--workers=1'
], { cwd: process.cwd(), env: childEnv, stdio: 'inherit' })
let cleanupAttempted = false

try {
  await waitForHandshake('BROWSER_READY')
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/prepare-l1-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--stage=create', '--execute'], { stdio: 'inherit', env: process.env })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-l1-b-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--stage=created'], { stdio: 'inherit', env: process.env })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/prepare-l1-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--stage=approve', '--execute'], { stdio: 'inherit', env: process.env })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-l1-b-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--stage=fixture-ready'], { stdio: 'inherit', env: process.env })
  atomicWriteHandshake({ ...readHandshake(runId), state: 'FIXTURE_READY' })
  writeEvent('FIXTURE_READY')
  await waitForEvent('ACTION_ARMED')
  await waitForEvent('FINAL_DELIVERY_ARMED')
  if (readEvent() !== 'FINAL_DELIVERY_ARMED') fail('invalid_delivery_handshake_order')
  if (!Object.hasOwn(childEnv, 'RESEND_API_KEY') || childEnv.RESEND_API_KEY !== '') fail('email_provider_sanitization_lost')
  writeEvent('EMAIL_PROVIDER_DISABLED_PROVEN')
  consumeDeliveryAttempt()
  writeEvent('DELIVERY_SUBMIT_AUTHORIZED')
  atomicWriteHandshake({ ...readHandshake(runId), state: 'ACTION_GO' })
  await waitForEvent('DELIVERY_SUBMIT_ATTEMPTED')
  await waitForEvent('DELIVERY_RESULT_OBSERVED')
  const code = await waitForChild()
  if (code !== 0) fail('delivery_browser_failed')
  writeEvent('CLEANUP_REQUIRED')
  cleanupTrackedFixture()
  writeEvent('COMPLETE')
  console.log('EMAIL_PROVIDER_MAX_SUBMISSIONS: 0')
  console.log('DELIVERY_SERVER_ACTION_MAX_SUBMISSIONS: 1')
} catch (error) {
  if (child.exitCode === null) child.kill('SIGTERM')
  await waitForChild().catch(() => {})
  if (!cleanupAttempted && canRecover()) {
    try { cleanupTrackedFixture() } catch { console.error('L1_DELIVERY_CLEANUP: unavailable_or_failed') }
  }
  try { if (readHandshake(runId)?.state !== 'CLEAN') atomicWriteHandshake({ ...readHandshake(runId), state: 'ABORT' }) } catch {}
  console.error('L1_DELIVERY_RUNTIME: FAIL\nCATEGORY: ' + (error instanceof Error && /^[a-z0-9_-]+$/i.test(error.message) ? error.message : 'runtime_failed'))
  process.exit(1)
}

function makeBrowserEnvironment(id, capture) {
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USER: process.env.USER,
    SHELL: process.env.SHELL,
    E2E_EXPECTED_PROJECT_REF: expectedRef,
    RESEND_API_KEY: '',
    E2E_RUNTIME_DIR: path.resolve('.e2e-state/runtime'),
    E2E_RUNTIME_RUN_ID: id,
    E2E_POST_CAPTURE_FILE: capture,
  }
  return Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined))
}

function readEvent() {
  if (!fs.existsSync(eventPath)) return null
  return JSON.parse(fs.readFileSync(eventPath, 'utf8')).state
}

function writeEvent(state, allowInitial = false) {
  const order = ['BROWSER_READY', 'FIXTURE_READY', 'ACTION_ARMED', 'INITIAL_CONFIRMATION_TRIGGERED', 'FINAL_DELIVERY_ARMED', 'EMAIL_PROVIDER_DISABLED_PROVEN', 'DELIVERY_SUBMIT_AUTHORIZED', 'DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED', 'CLEANUP_REQUIRED', 'COMPLETE']
  const previous = readEvent()
  if (!allowInitial && order.indexOf(state) <= order.indexOf(previous)) fail('delivery_event_order_invalid')
  const temp = `${eventPath}.${process.pid}.${crypto.randomUUID()}.tmp`
  fs.writeFileSync(temp, JSON.stringify({ version: 1, project: 'e2e', run_id: runId, state }) + '\n', { mode: 0o600 })
  fs.renameSync(temp, eventPath)
}

async function waitForEvent(expected) {
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    const state = readEvent()
    if (state === 'ABORT') fail('runtime_aborted')
    if (state === expected) return
    if (state && ['DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED'].includes(state) && orderOf(state) > orderOf(expected)) fail('delivery_event_skipped_' + expected.toLowerCase())
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  fail('delivery_event_timeout_' + expected.toLowerCase())
}

function orderOf(state) { return ['BROWSER_READY', 'FIXTURE_READY', 'ACTION_ARMED', 'INITIAL_CONFIRMATION_TRIGGERED', 'FINAL_DELIVERY_ARMED', 'EMAIL_PROVIDER_DISABLED_PROVEN', 'DELIVERY_SUBMIT_AUTHORIZED', 'DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED', 'CLEANUP_REQUIRED', 'COMPLETE'].indexOf(state) }
async function waitForHandshake(expected) {
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    if (readHandshake(runId)?.state === expected) return
    if (readHandshake(runId)?.state === 'ABORT') fail('runtime_aborted')
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  fail('runtime_handshake_timeout_' + expected.toLowerCase())
}
function waitForChild() { return child.exitCode !== null ? Promise.resolve(child.exitCode) : new Promise((resolve) => child.once('exit', (code) => resolve(code ?? 1))) }
function consumeDeliveryAttempt() {
  const current = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  if (current.deliveryAttempt !== 0) fail('delivery_attempt_already_consumed')
  atomicSnapshot({ ...current, deliveryAttempt: 1 })
}
function canRecover() {
  try { const s = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')); return s.requestCreateAttempt === 1 && s.cleanupAttempt === 0 && s.requestId && s.ownershipToken } catch { return false }
}
function cleanupTrackedFixture() {
  if (cleanupAttempted) throw new Error('cleanup_retry_forbidden')
  cleanupAttempted = true
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/cleanup-l1-delivery-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-L1-CLEANUP' } })
  clearRecoveryState()
}
function atomicSnapshot(value) {
  const temp = `${snapshotPath}.${process.pid}.${crypto.randomUUID()}.tmp`
  fs.writeFileSync(temp, JSON.stringify(value, (_key, item) => item === undefined ? undefined : item, 2) + '\n', { mode: 0o600 })
  fs.renameSync(temp, snapshotPath)
}
function clearRecoveryState() {
  const current = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  if (current.cleanupAttempt !== 1) throw new Error('cleanup_counter_regression')
  atomicSnapshot({ ...current, requestId: undefined, requestItemId: undefined, ownershipToken: undefined, fixtureReady: undefined, createFailureClass: undefined, remoteWriteConfirmed: false })
}
function fail(code) { throw new Error(code) }
