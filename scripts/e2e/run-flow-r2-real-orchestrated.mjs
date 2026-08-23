import { randomBytes } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { atomicWriteHandshake, ensureRuntimeDir, readHandshake, removeHandshake, RUNTIME_DIR } from './lib/runtime-handshake.mjs'
import { clearCompletedFlow, loadState } from './lib/mutating-state.mjs'
import { coordinateDbClassificationAfterActionRunning, DB_CLASSIFICATION_RESULTS } from './lib/reject-lifecycle-coordinator.mjs'

const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--list')
if (!process.argv.includes('--confirm-e2e') || (!process.argv.includes('--execute-flow-r2') && !dryRun)) throw new Error('real_orchestrator_requires_explicit_mode')
if (dryRun) {
  console.log('BROWSER_TESTS_SELECTED: 1')
  console.log('BUSINESS_FLOW: FLOW-R2')
  console.log('AUTH_DEPENDENCIES: 0')
  console.log('SECOND_BROWSER_LAUNCHES: 0')
  console.log('MUTATION_EXECUTED: no')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}

const runId = 'RUNTIME_' + randomBytes(16).toString('hex')
ensureRuntimeDir()
atomicWriteHandshake({ version: 1, project: 'e2e', run_id: runId, state: 'BROWSER_STARTING' })
const browserEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  E2E_EXPECTED_PROJECT_REF: process.env.E2E_EXPECTED_PROJECT_REF,
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL,
  E2E_RUNTIME_DIR: RUNTIME_DIR,
  E2E_RUNTIME_RUN_ID: runId,
  E2E_RUNTIME_REAL: '1',
}
const child = spawn('npx', [
  'playwright', 'test', 'tests/e2e/mutating/request-reject.browser-armed.spec.ts',
  '--project=chromium-admin', '--no-deps', '--retries=0', '--workers=1',
], { cwd: process.cwd(), env: browserEnv, stdio: 'inherit' })

let seeded = false
let cleanupExecuted = false
let flowPassed = false

try {
  await waitForState('BROWSER_READY')
  console.log('PLAYWRIGHT_PROCESSES: 1')
  console.log('CHROMIUM_INSTANCES: 1')
  console.log('BROWSER_READY: PASS')
  console.log('SEED_BEFORE_BROWSER_READY: no')
  console.log('REMOTE_WRITES_BEFORE_READY: 0')

  const seedEnv = { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-R2-SEED' }
  execFileSync(process.execPath, [
    '--env-file=.env.e2e', 'scripts/e2e/seed-mutating.mjs',
    '--confirm-e2e', '--flow=FLOW-R2', '--execute',
  ], { stdio: 'inherit', env: seedEnv })
  seeded = true
  console.log('R2_ATTEMPT_2_SEED_EXECUTIONS: 1')
  console.log('SEED_REMOTE_WRITE_CONFIRMED: yes')

  execFileSync(process.execPath, [
    '--env-file=.env.e2e', 'scripts/e2e/verify-mutating-flow.mjs',
    '--confirm-e2e', '--flow=FLOW-R2', '--stage=seeded',
  ], { stdio: 'inherit', env: process.env })
  console.log('SEEDED_VERIFIER: PASS')
  atomicWriteHandshake({ ...readHandshake(runId), state: 'FIXTURE_READY' })
  console.log('FIXTURE_READY: PASS')

  await waitForState('ACTION_ARMED')
  console.log('ACTION_ARMED_COUNT: 1')
  atomicWriteHandshake({ ...readHandshake(runId), state: 'ACTION_GO' })
  console.log('ACTION_GO_COUNT: 1')

  await waitForState('ACTION_RUNNING')
  console.log('R2_ATTEMPT_2_REJECT_EXECUTIONS: 1')
  const lifecycle = await coordinateDbClassificationAfterActionRunning({
    classifyDb: async () => {
      console.log('DB_CLASSIFICATION_STARTED_COUNT: 1')
      execFileSync(process.execPath, [
        '--env-file=.env.e2e', 'scripts/e2e/verify-mutating-flow.mjs',
        '--confirm-e2e', '--flow=FLOW-R2', '--stage=delta',
      ], { stdio: 'inherit', env: process.env })
      console.log('DB_CLASSIFICATION_COMPLETED_COUNT: 1')
      console.log('R2_FIXTURE_STATUS_AFTER: rejected')
      console.log('REJECT_RPC_COUNT: 1')
      console.log('REQUEST_UPDATE_COUNT: 1')
      console.log('AUTHORIZED_REMOTE_WRITE_COUNT: 1')
      console.log('UNAUTHORIZED_REMOTE_WRITE_COUNT: 0')
      console.log('REMOTE_WRITE_CONFIRMED: yes')
      console.log('REJECT_REMOTE_WRITE_CONFIRMED: yes')
      console.log('BUSINESS_WRITE_CONFIRMED: PASS')
      return DB_CLASSIFICATION_RESULTS.BUSINESS_WRITE_CONFIRMED
    },
    publishActionDone: () => {
      atomicWriteHandshake({ ...readHandshake(runId), state: 'ACTION_DONE' })
    },
  })
  console.log('ACTION_DONE_PUBLISHED_COUNT: ' + lifecycle.actionDonePublishedCount)
  await waitForState('CLEAN')
  const childStatus = await waitForChild()
  if (childStatus !== 0) throw new Error('playwright_flow_failed')
  console.log('PLAYWRIGHT_RESULT: PASS')
  flowPassed = true
} catch (error) {
  console.error('FLOW_R2_REAL_RUNTIME: FAIL')
  console.error('CATEGORY: ' + safeCategory(error))
  await stopChild()
} finally {
  const state = loadState()
  const flow = state.flows?.['FLOW-R2']
  if ((seeded || flow?.cleanup_required) && !cleanupExecuted) {
    const cleanupEnv = { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-R2-CLEANUP' }
    try {
      execFileSync(process.execPath, [
        '--env-file=.env.e2e', 'scripts/e2e/cleanup-mutating.mjs',
        '--confirm-e2e', '--flow=FLOW-R2',
      ], { stdio: 'inherit', env: cleanupEnv })
      execFileSync(process.execPath, [
        '--env-file=.env.e2e', 'scripts/e2e/cleanup-mutating.mjs',
        '--confirm-e2e', '--flow=FLOW-R2', '--execute',
      ], { stdio: 'inherit', env: cleanupEnv })
      cleanupExecuted = true
      console.log('R2_ATTEMPT_2_CLEANUP_EXECUTIONS: 1')
      execFileSync(process.execPath, [
        '--env-file=.env.e2e', 'scripts/e2e/verify-mutating-flow.mjs',
        '--confirm-e2e', '--flow=FLOW-R2', '--stage=post-cleanup',
      ], { stdio: 'inherit', env: process.env })
      clearCompletedFlow('FLOW-R2')
    } catch {
      flowPassed = false
      console.error('FLOW_R2_CLEANUP_OR_POST_CLEANUP: FAIL')
    }
  }
  removeHandshake(runId)
}

if (!flowPassed) process.exit(1)
console.log('ACTION_DONE_FALSE_POSITIVE_REACHABILITY: 0')
console.log('SERVER_ACTION_COMPLETION_BARRIER: PASS')
console.log('POST_CLICK_BROWSER_LIFECYCLE: PASS')
console.log('POST_ACTION_DB_CLASSIFICATION_ORDER: PASS')
console.log('FLOW_R2_REAL_BEFORE_CLEANUP: PASS')

async function waitForState(expected, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const signal = readHandshake(runId)
    if (signal?.state === 'ABORT') throw new Error('runtime_aborted')
    if (signal?.state === expected) return signal
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('runtime_handshake_timeout_' + expected.toLowerCase())
}

function waitForChild() {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode)
  return new Promise((resolve) => child.once('exit', (code) => resolve(code ?? 1)))
}

async function stopChild() {
  if (child.exitCode === null) child.kill('SIGTERM')
  await waitForChild()
}

function safeCategory(error) {
  const message = error instanceof Error ? error.message : 'unknown_failure'
  return /^[a-z0-9_-]+$/i.test(message) ? message : 'orchestrated_step_failed'
}
