import { execFileSync, spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { atomicWriteHandshake, ensureRuntimeDir, makeRunId, readHandshake, RUNTIME_DIR } from './lib/runtime-handshake.mjs'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--execute-b')) fail('explicit_l1_b_authorization_required')
const runId = makeRunId()
ensureRuntimeDir()
atomicWriteHandshake({ version: 1, project: 'e2e', run_id: runId, state: 'BROWSER_STARTING' })
const capturePath = `${RUNTIME_DIR}/${runId}.l1-posts.json`
const child = spawn('npx', ['playwright', 'test', 'tests/e2e/mutating/request-delivery-l1-b.rehearsal.spec.ts', '--project=chromium-lab-staff', '--no-deps', '--retries=0', '--workers=1'], { cwd: process.cwd(), env: { ...process.env, E2E_RUNTIME_DIR: RUNTIME_DIR, E2E_RUNTIME_RUN_ID: runId, E2E_POST_CAPTURE_FILE: capturePath }, stdio: 'inherit' })
let cleanupInvocationAttempted = false
try {
  await waitForState('BROWSER_READY')
  console.log('L1_B_BROWSER_RUNS: 1')
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/prepare-l1-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--stage=create', '--execute'], { stdio: 'inherit', env: process.env })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-l1-b-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--stage=created'], { stdio: 'inherit', env: process.env })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/prepare-l1-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--stage=approve', '--execute'], { stdio: 'inherit', env: process.env })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-l1-b-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--stage=fixture-ready'], { stdio: 'inherit', env: process.env })
  atomicWriteHandshake({ ...readHandshake(runId), state: 'FIXTURE_READY' })
  await waitForState('ACTION_ARMED')
  atomicWriteHandshake({ ...readHandshake(runId), state: 'CANCEL' })
  const code = await waitForChild()
  if (code !== 0) fail('browser_rehearsal_failed')
  cleanupTrackedFixture()
  console.log('L1_B_REAL_DELIVERY_CONFIRM_CLICKS: 0')
  console.log('L1_BUSINESS_DELIVERY_EXECUTIONS: 0')
  console.log('L1_B_CLEANUP_EXECUTIONS: 1')
} catch (error) {
  if (child.exitCode === null) child.kill('SIGTERM')
  await waitForChild().catch(() => {})
  if (!cleanupInvocationAttempted) {
    try {
      const snapshot = JSON.parse(fs.readFileSync('.e2e-state/runtime/l1-b-snapshot.json', 'utf8'))
      if (snapshot.cleanupAttempt === 0 && snapshot.requestCreateAttempt === 1 && snapshot.requestId && snapshot.ownershipToken && snapshot.createFailureClass !== 'known_duplicate_request') {
        cleanupTrackedFixture()
        console.error('L1_B_FAILURE_CLEANUP: exact_fixture_cleanup_completed')
      }
    } catch {
      console.error('L1_B_FAILURE_CLEANUP: unavailable_or_failed')
    }
  }
  try { if (readHandshake(runId)?.state === 'ACTION_ARMED') atomicWriteHandshake({ ...readHandshake(runId), state: 'ABORT' }) } catch {}
  console.error('L1_B_RUNTIME: FAIL\nCATEGORY: ' + (error instanceof Error && /^[a-z0-9_-]+$/i.test(error.message) ? error.message : 'runtime_failed'))
  process.exit(1)
} finally {
}

function waitForState(expected) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 180000
    const poll = () => {
      const state = readHandshake(runId)?.state
      if (state === expected) return resolve(state)
      if (state === 'ABORT') return reject(new Error('runtime_aborted'))
      if (child.exitCode !== null) return reject(new Error('browser_child_failed_before_' + expected.toLowerCase()))
      if (Date.now() >= deadline) return reject(new Error('runtime_handshake_timeout'))
      setTimeout(poll, 100)
    }
    poll()
  })
}
function waitForChild() {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode)
  return new Promise((resolve) => child.once('exit', (code) => resolve(code ?? 1)))
}
function cleanupTrackedFixture() {
  if (cleanupInvocationAttempted) throw new Error('cleanup_retry_forbidden')
  cleanupInvocationAttempted = true
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/cleanup-l1-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-L1-CLEANUP' } })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-l1-b-fixture.mjs', '--confirm-e2e', '--flow=FLOW-L1', '--stage=post-cleanup'], { stdio: 'inherit', env: process.env })
  clearRecoveryState()
}
function clearRecoveryState() {
  const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
  const current = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  if (current.cleanupAttempt !== 1) throw new Error('cleanup_counter_regression')
  const next = { ...current, requestId: undefined, requestItemId: undefined, ownershipToken: undefined, fixtureReady: undefined, createFailureClass: undefined, remoteWriteConfirmed: false }
  const tempPath = `${snapshotPath}.${process.pid}.${crypto.randomUUID()}.tmp`
  let fd = -1
  let renamed = false
  try {
    fd = fs.openSync(tempPath, 'wx', 0o600)
    fs.writeFileSync(fd, JSON.stringify(next, (_key, value) => value === undefined ? undefined : value, 2) + '\n')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
    fd = -1
    fs.renameSync(tempPath, snapshotPath)
    renamed = true
    const directoryFd = fs.openSync(path.dirname(snapshotPath), 'r')
    try {
      fs.fsyncSync(directoryFd)
    } finally {
      fs.closeSync(directoryFd)
    }
    fs.chmodSync(snapshotPath, 0o600)
  } catch (error) {
    if (fd !== -1) {
      try { fs.closeSync(fd) } catch {}
    }
    if (!renamed) {
      try { fs.rmSync(tempPath, { force: true }) } catch {}
    }
    throw error
  }
}
function fail(code) { throw new Error(code) }
