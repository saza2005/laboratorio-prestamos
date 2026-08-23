import crypto from 'node:crypto'
import fs from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import path from 'node:path'
import { atomicWriteHandshake, ensureRuntimeDir, makeRunId, readHandshake } from './lib/runtime-handshake.mjs'

const args = new Set(process.argv.slice(2))
const root = path.resolve('/home/saza/Proyectos/laboratorio-prestamos-e2e')
const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
const actualSpec = 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'
const cleanupPath = 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'
const eventOrder = ['BROWSER_READY', 'FIXTURE_READY', 'ACTION_ARMED', 'INITIAL_CONFIRMATION_TRIGGERED', 'FINAL_DELIVERY_ARMED', 'EMAIL_PROVIDER_DISABLED_PROVEN', 'DELIVERY_SUBMIT_AUTHORIZED', 'DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED', 'CLEANUP_REQUIRED', 'COMPLETE']

if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--execute-b-delivery')) fail('explicit_l1_delivery_authorization_required')
if (process.cwd() !== root) fail('wrong_project_workdir')
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }
const expectedRef = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
const publicUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
if (!expectedRef || !publicUrl || !publicUrl.startsWith(`https://${expectedRef}.supabase.co`)) fail('e2e_project_identity_mismatch')

const initial = readJson(snapshotPath)
for (const key of ['requestCreateAttempt', 'approvalAttempt', 'deliveryAttempt', 'cleanupAttempt']) if (initial[key] !== 0) fail('tracker_not_pristine_' + key)
if (initial.fixtureReady === true || initial.requestId || initial.requestItemId || initial.ownershipToken) fail('active_fixture_prestate')

ensureRuntimeDir()
const runId = makeRunId()
const eventPath = path.resolve(`.e2e-state/runtime/${runId}.delivery.json`)
const capturePath = path.resolve(`.e2e-state/runtime/${runId}.l1-posts.json`)
fs.rmSync(eventPath, { force: true })
const childEnv = makeBrowserEnvironment(runId, capturePath)
if (!Object.hasOwn(childEnv, 'RESEND_API_KEY') || childEnv.RESEND_API_KEY !== '') fail('email_provider_sanitization_failed')
atomicWriteHandshake({ version: 1, project: 'e2e', run_id: runId, state: 'BROWSER_STARTING' })

const child = spawn('npx', ['playwright', 'test', actualSpec, '--project=chromium-lab-staff', '--no-deps', '--retries=0', '--workers=1'], { cwd: root, env: childEnv, stdio: 'inherit' })
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
  if (childEnv.RESEND_API_KEY !== '') fail('email_provider_sanitization_lost')
  writeEvent('EMAIL_PROVIDER_DISABLED_PROVEN')
  consumeDeliveryAttempt()
  writeEvent('DELIVERY_SUBMIT_AUTHORIZED')
  atomicWriteHandshake({ ...readHandshake(runId), state: 'ACTION_GO' })

  const terminal = await waitForResultOrChildExit()
  if (terminal === 'result') writeEvent('CLEANUP_REQUIRED')
  else writeCleanupAuditEvent()

  const childCode = await waitForChild()
  await runCleanupOnce()
  if (childCode !== 0) fail('delivery_browser_failed_after_cleanup')
  writeEvent('COMPLETE')
  console.log('EMAIL_PROVIDER_DISABLED_PROVEN')
  console.log('EMAIL_PROVIDER_MAX_SUBMISSIONS: 0')
  console.log('DELIVERY_SERVER_ACTION_MAX_SUBMISSIONS: 1')
} catch (error) {
  if (child.exitCode === null) child.kill('SIGTERM')
  await waitForChild().catch(() => {})
  if (!cleanupAttempted && canRecover()) {
    try { writeCleanupAuditEvent(); await runCleanupOnce() } catch { console.error('L1_DELIVERY_CLEANUP: FAIL_CLOSED_WITH_RESIDUAL_STATE') }
  }
  try { if (readHandshake(runId)?.state !== 'CLEAN') atomicWriteHandshake({ ...readHandshake(runId), state: 'ABORT' }) } catch {}
  console.error('L1_DELIVERY_RUNTIME: FAIL\nCATEGORY: ' + (error instanceof Error && /^[a-z0-9_-]+$/i.test(error.message) ? error.message : 'runtime_failed'))
  process.exit(1)
}

function makeBrowserEnvironment(id, capture) {
  return Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, SHELL: process.env.SHELL, E2E_EXPECTED_PROJECT_REF: expectedRef, RESEND_API_KEY: '', E2E_RUNTIME_DIR: path.resolve('.e2e-state/runtime'), E2E_RUNTIME_RUN_ID: id, E2E_POST_CAPTURE_FILE: capture }).filter(([, value]) => value !== undefined))
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')) }
function readEvent() { return fs.existsSync(eventPath) ? readJson(eventPath).state : null }
function writeEvent(state) {
  const previous = readEvent()
  if (!eventOrder.includes(state) || (previous && eventOrder.indexOf(state) <= eventOrder.indexOf(previous))) fail('delivery_event_order_invalid')
  atomicEventWrite(state)
}
function writeCleanupAuditEvent() {
  const previous = readEvent()
  if (previous === 'CLEANUP_REQUIRED' || previous === 'COMPLETE') return
  if (!previous || eventOrder.indexOf(previous) >= eventOrder.indexOf('CLEANUP_REQUIRED')) fail('cleanup_event_order_invalid')
  atomicEventWrite('CLEANUP_REQUIRED')
}
function atomicEventWrite(state) {
  const temp = `${eventPath}.${process.pid}.${crypto.randomUUID()}.tmp`
  fs.writeFileSync(temp, JSON.stringify({ version: 1, project: 'e2e', run_id: runId, state }) + '\n', { mode: 0o600 })
  fs.renameSync(temp, eventPath)
}
async function waitForEvent(expected) {
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    const state = readEvent()
    if (state === expected) return
    if (state === 'ABORT' || (state && eventOrder.indexOf(state) > eventOrder.indexOf(expected))) fail('delivery_event_skipped_' + expected.toLowerCase())
    if (child.exitCode !== null) fail('child_exit_before_' + expected.toLowerCase())
    await sleep(100)
  }
  fail('delivery_event_timeout_' + expected.toLowerCase())
}
async function waitForHandshake(expected) {
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    const state = readHandshake(runId)?.state
    if (state === expected) return
    if (state === 'ABORT' || child.exitCode !== null) fail('child_exit_before_browser_ready')
    await sleep(100)
  }
  fail('runtime_handshake_timeout')
}
async function waitForResultOrChildExit() {
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    const state = readEvent()
    if (state === 'DELIVERY_RESULT_OBSERVED') return 'result'
    if (child.exitCode !== null) return 'child_exit'
    await sleep(100)
  }
  fail('delivery_result_or_child_exit_timeout')
}
function waitForChild() { return child.exitCode !== null ? Promise.resolve(child.exitCode) : new Promise((resolve) => child.once('exit', (code) => resolve(code ?? 1))) }
async function runCleanupOnce() {
  if (cleanupAttempted) throw new Error('cleanup_retry_forbidden')
  cleanupAttempted = true
  execFileSync(process.execPath, ['--env-file=.env.e2e', cleanupPath, '--confirm-e2e', '--flow=FLOW-L1', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-L1-CLEANUP' } })
  clearRecoveryState()
}
function canRecover() { try { const s = readJson(snapshotPath); return s.requestCreateAttempt === 1 && s.cleanupAttempt === 0 && s.requestId && s.ownershipToken } catch { return false } }
function consumeDeliveryAttempt() { const current = readJson(snapshotPath); if (current.deliveryAttempt !== 0) fail('delivery_attempt_already_consumed'); atomicSnapshot({ ...current, deliveryAttempt: 1 }) }
function atomicSnapshot(value) { const temp = `${snapshotPath}.${process.pid}.${crypto.randomUUID()}.tmp`; fs.writeFileSync(temp, JSON.stringify(value, (_key, item) => item === undefined ? undefined : item, 2) + '\n', { mode: 0o600 }); fs.renameSync(temp, snapshotPath) }
function clearRecoveryState() { const current = readJson(snapshotPath); if (current.cleanupAttempt !== 1) throw new Error('cleanup_counter_regression'); atomicSnapshot({ ...current, requestId: undefined, requestItemId: undefined, ownershipToken: undefined, fixtureReady: undefined, createFailureClass: undefined, remoteWriteConfirmed: false }) }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
function fail(code) { throw new Error(code) }
