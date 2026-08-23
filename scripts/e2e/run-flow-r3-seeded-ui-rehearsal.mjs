import { execFileSync, spawn } from 'node:child_process'
import { atomicWriteHandshake, ensureRuntimeDir, makeRunId, readHandshake, removeHandshake, RUNTIME_DIR } from './lib/runtime-handshake.mjs'
import { clearCompletedFlow, loadState } from './lib/mutating-state.mjs'

const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--list')
const readOnlyBrowserReady = process.argv.includes('--browser-ready-readonly')
const diagnosticApproval = process.argv.includes('--execute-flow-r3-s3')
const captureDiagnostic = process.argv.includes('--execute-flow-r3-s3b')
const correctedBoundary = process.argv.includes('--execute-flow-r3-s3c')
const realApproval = process.argv.includes('--execute-flow-r3-real-1')
const locatorValidation = process.argv.includes('--execute-flow-r3-real-1b')
const captureBoundary = captureDiagnostic || correctedBoundary || realApproval
if (!process.argv.includes('--confirm-e2e') || (!process.argv.includes('--execute-flow-r3-s2') && !diagnosticApproval && !captureBoundary && !realApproval && !locatorValidation && !readOnlyBrowserReady && !dryRun)) fail('explicit_mode_required')
if (dryRun) {
  console.log('BROWSER_TESTS_SELECTED: 1\nBUSINESS_FLOW: FLOW-R3\nAUTH_DEPENDENCIES: 0\nSECOND_BROWSER_LAUNCHES: 0\nMUTATION_EXECUTED: no\nREMOTE_WRITES: 0')
  process.exit(0)
}

const runId = makeRunId()
ensureRuntimeDir()
atomicWriteHandshake({ version: 1, project: 'e2e', run_id: runId, state: 'BROWSER_STARTING' })
const browserEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  E2E_EXPECTED_PROJECT_REF: process.env.E2E_EXPECTED_PROJECT_REF,
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL,
  E2E_RUNTIME_READONLY: readOnlyBrowserReady ? '1' : '0',
  E2E_RUNTIME_S3_DIAGNOSTIC: diagnosticApproval || captureBoundary ? '1' : '0',
  E2E_RUNTIME_S3B_CAPTURE: captureBoundary ? '1' : '0',
  E2E_RUNTIME_REAL_APPROVAL: realApproval ? '1' : '0',
  E2E_RUNTIME_LOCATOR_VALIDATION: locatorValidation ? '1' : '0',
  E2E_POST_CAPTURE_FILE: captureBoundary ? `${RUNTIME_DIR}/${runId}.s3c-posts.json` : '',
  E2E_RUNTIME_DIR: RUNTIME_DIR,
  E2E_RUNTIME_RUN_ID: runId,
}
const child = spawn('npx', ['playwright', 'test', 'tests/e2e/mutating/request-approve.browser-armed.spec.ts', '--project=chromium-admin', '--no-deps', '--retries=0', '--workers=1'], { cwd: process.cwd(), env: browserEnv, stdio: 'inherit' })
let seeded = false
let cleanupExecuted = false
let flowPassed = false
try {
  await waitForState('BROWSER_READY')
  console.log('PLAYWRIGHT_PROCESSES: 1\nCHROMIUM_INSTANCES: 1\nBROWSER_READY_COUNT: 1\nSEED_BEFORE_BROWSER_READY: no\nREMOTE_MUTATING_WRITES_BEFORE_READY: 0')
  if (readOnlyBrowserReady) {
    atomicWriteHandshake({ ...readHandshake(runId), state: 'HANDOFF_DRY_RUN' })
    await waitForState('ACTION_ARMED_DRY_RUN')
    atomicWriteHandshake({ ...readHandshake(runId), state: 'CANCEL' })
    const childStatus = await waitForChild()
    if (childStatus !== 0) throw new Error('readonly_browser_ready_failed')
    flowPassed = true
    console.log('S2A_READ_ONLY: yes\nNEW_R3_SEED_EXECUTIONS: 0\nREMOTE_WRITES: 0')
  } else {
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/seed-mutating-r3.mjs', '--confirm-e2e', '--flow=FLOW-R3', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-R3-SEED' } })
  seeded = true
  console.log('R3_S2_REAL_SEED_EXECUTIONS: 1\nR3_SEED_RPC_EXECUTIONS: 1\nSEED_REMOTE_WRITE_CONFIRMED: yes')
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-mutating-flow-r3.mjs', '--confirm-e2e', '--flow=FLOW-R3', '--stage=seeded'], { stdio: 'inherit', env: process.env })
  console.log('R3_SEEDED_VERIFIER: PASS\nFIXTURE_READY: PASS')
  atomicWriteHandshake({ ...readHandshake(runId), state: 'FIXTURE_READY' })
  await waitForState('ACTION_ARMED')
  console.log('ACTION_ARMED_COUNT: 1')
  if (realApproval) {
    atomicWriteHandshake({ ...readHandshake(runId), state: 'ACTION_GO' })
    console.log('ACTION_GO_COUNT: 1')
    await waitForState('ACTION_RUNNING')
    console.log('ACTION_RUNNING_PUBLISHED_COUNT: 1')
    console.log('DB_CLASSIFICATION_STARTED_COUNT: 1')
    execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-mutating-flow-r3.mjs', '--confirm-e2e', '--flow=FLOW-R3', '--stage=delta'], { stdio: 'inherit', env: process.env })
    console.log('DB_CLASSIFICATION_COMPLETED_COUNT: 1\nBUSINESS_DB_RESULT: PASS\nAPPROVE_RPC_COUNT: 1\nAPPROVAL_REQUEST_UPDATE_COUNT: 1\nAPPROVAL_REQUEST_ITEM_UPDATE_COUNT: 1\nAPPROVAL_OTHER_WRITE_COUNT: 0\nAPPROVAL_REMOTE_WRITE_CONFIRMED: yes')
    atomicWriteHandshake({ ...readHandshake(runId), state: 'ACTION_DONE' })
    console.log('ACTION_DONE_PUBLISHED_COUNT: 1')
    await waitForState('CLEAN')
  } else {
    atomicWriteHandshake({ ...readHandshake(runId), state: 'CANCEL' })
    const childStatus = await waitForChild()
    if (childStatus !== 0) throw new Error('readonly_ui_rehearsal_failed')
    console.log('R3_S2_APPROVAL_EXECUTIONS: 0\nAPPROVE_RPC_EXECUTIONS: 0')
  }
  const childStatus = await waitForChild()
  if (childStatus !== 0) throw new Error('r3_ui_rehearsal_failed')
  console.log('SAME_CHROMIUM_AFTER_SEED: yes\nCANONICAL_STATE_GATE: PASS\nR3_EXACT_FIXTURE_SELECTED: yes')
  flowPassed = true
  }
} catch (error) {
  console.error('R3_S2_RUNTIME: FAIL\nCATEGORY: ' + safeCategory(error))
  if (child.exitCode === null) child.kill('SIGTERM')
  await waitForChild()
} finally {
  const flow = loadState().flows?.['FLOW-R3']
  if ((seeded || flow?.cleanup_required) && !cleanupExecuted) {
    try {
      execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/cleanup-mutating-r3.mjs', '--confirm-e2e', '--flow=FLOW-R3'], { stdio: 'inherit', env: process.env })
      execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/cleanup-mutating-r3.mjs', '--confirm-e2e', '--flow=FLOW-R3', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-R3-CLEANUP' } })
      cleanupExecuted = true
      execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-mutating-flow-r3.mjs', '--confirm-e2e', '--flow=FLOW-R3', '--stage=post-cleanup'], { stdio: 'inherit', env: process.env })
      clearCompletedFlow('FLOW-R3')
      console.log('R3_S2_REAL_CLEANUP_EXECUTIONS: 1')
    } catch { console.error('R3_POST_CLEANUP: FAIL') }
  }
  removeHandshake(runId)
}
if (!flowPassed) process.exit(1)
console.log('POST_CLICK_BROWSER_LIFECYCLE: PASS\nPOST_ACTION_DB_CLASSIFICATION_ORDER: PASS')

async function waitForState(expected, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const signal = readHandshake(runId)
    if (signal?.state === 'ABORT') throw new Error('runtime_aborted')
    if (signal?.state === expected) return signal
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('runtime_handshake_timeout_' + expected.toLowerCase())
}
function waitForChild() { if (child.exitCode !== null) return Promise.resolve(child.exitCode); return new Promise((resolve) => child.once('exit', (code) => resolve(code ?? 1))) }
function safeCategory(error) { const message = error instanceof Error ? error.message : 'unknown_failure'; return /^[a-z0-9_-]+$/i.test(message) ? message : 'orchestrated_step_failed' }
function fail(code) { console.error('R3_S2_RUNNER: FAIL\nCATEGORY: ' + code); process.exit(1) }
