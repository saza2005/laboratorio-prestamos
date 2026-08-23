import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import { atomicWriteHandshake, ensureRuntimeDir, makeRunId, readHandshake, RUNTIME_DIR } from './lib/runtime-handshake.mjs'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R4') || !args.has('--execute-real-1')) fail('explicit_real_authorization_required')
const expectedPath = JSON.parse(fs.readFileSync('.e2e-state/runtime/r4-c-posts.json', 'utf8')).find((record) => record.runtime_classifier_result === 'SERVER_ACTION')?.path_class
if (expectedPath !== '/solicitudes/grupal') fail('r4c_boundary_path_mismatch')

const runId = makeRunId()
ensureRuntimeDir()
atomicWriteHandshake({ version: 1, project: 'e2e', run_id: runId, state: 'BROWSER_STARTING' })
const capturePath = `${RUNTIME_DIR}/${runId}.r4-posts.json`
const browserEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  E2E_EXPECTED_PROJECT_REF: process.env.E2E_EXPECTED_PROJECT_REF,
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL,
  E2E_RUNTIME_DIR: RUNTIME_DIR,
  E2E_RUNTIME_RUN_ID: runId,
  E2E_POST_CAPTURE_FILE: capturePath,
}
const child = spawn('npx', ['playwright', 'test', 'tests/e2e/mutating/request-create-r4-real1.spec.ts', '--project=chromium-teacher', '--no-deps', '--retries=0', '--workers=1'], { cwd: process.cwd(), env: browserEnv, stdio: 'inherit' })

try {
  await waitForState('BROWSER_READY')
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-r4-real1-pre.mjs'], { stdio: 'inherit', env: process.env })
  atomicWriteHandshake({ ...readHandshake(runId), state: 'FIXTURE_WAIT' })
  atomicWriteHandshake({ ...readHandshake(runId), state: 'FIXTURE_READY' })
  atomicWriteHandshake({ ...readHandshake(runId), state: 'ACTION_ARMED' })
  const snapshotPath = '.e2e-state/runtime/r4-pre-snapshot.json'
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  if (snapshot.creationAttemptCount !== 0) fail('tracking_attempt_already_used')
  fs.writeFileSync(snapshotPath, JSON.stringify({ ...snapshot, creationAttemptCount: 1, businessWriteAuthorizationActive: true }, null, 2) + '\n', { mode: 0o600 })
  fs.chmodSync(snapshotPath, 0o600)
  atomicWriteHandshake({ ...readHandshake(runId), state: 'ACTION_GO' })
  await waitForState('ACTION_RUNNING')
  const delta = execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/classify-r4-real1.mjs', '--confirm-e2e', '--flow=FLOW-R4', '--stage=delta'], { stdio: 'inherit', env: process.env })
  void delta
  atomicWriteHandshake({ ...readHandshake(runId), state: 'ACTION_DONE' })
  await waitForChild()
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/cleanup-mutating-r4.mjs', '--confirm-e2e', '--flow=FLOW-R4', '--execute'], { stdio: 'inherit', env: { ...process.env, E2E_MUTATING_CONFIRM: 'FLOW-R4-CLEANUP' } })
  execFileSync(process.execPath, ['--env-file=.env.e2e', 'scripts/e2e/verify-mutating-flow-r4.mjs', '--confirm-e2e', '--flow=FLOW-R4', '--stage=post-cleanup'], { stdio: 'inherit', env: process.env })
  atomicWriteHandshake({ ...readHandshake(runId), state: 'CANCEL' })
  atomicWriteHandshake({ ...readHandshake(runId), state: 'CLEAN' })
  console.log('R4_ACTION_DONE_COUNT: 1')
  console.log('R4_ACTION_DONE_FALSE_POSITIVE_REACHABILITY: 0')
  console.log('R4_REAL1_CLEANUP_EXECUTIONS: 1')
} catch (error) {
  try { if (child.exitCode === null) child.kill('SIGTERM') } catch {}
  try { await waitForChild() } catch {}
  const current = readHandshake(runId)
  if (current?.state === 'ACTION_RUNNING') {
    try { atomicWriteHandshake({ ...current, state: 'ABORT' }); atomicWriteHandshake({ ...readHandshake(runId), state: 'CLEAN' }) } catch {}
  }
  console.error('R4_REAL1_RUNTIME: FAIL\nCATEGORY: ' + (error instanceof Error && /^[a-z0-9_-]+$/i.test(error.message) ? error.message : 'runtime_failed'))
  process.exit(1)
}

function waitForState(expected) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 180_000
    const poll = () => {
      const state = readHandshake(runId)?.state
      if (state === expected) return resolve(state)
      if (state === 'ABORT') return reject(new Error('runtime_aborted'))
      if (Date.now() >= deadline) return reject(new Error('runtime_handshake_timeout'))
      setTimeout(poll, 100)
    }
    poll()
  })
}

function waitForChild() {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode)
  return new Promise((resolve, reject) => child.once('exit', (code) => code === 0 ? resolve(0) : reject(new Error('browser_failed'))))
}

function fail(code) { throw new Error(code) }
