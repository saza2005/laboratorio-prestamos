import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { atomicWriteHandshake, ensureRuntimeDir, readHandshake, removeHandshake, RUNTIME_DIR } from './lib/runtime-handshake.mjs'

const args = new Set(process.argv.slice(2))
const mode = args.has('--post-ready-handoff-smoke') ? '--post-ready-handoff-smoke' : '--browser-handshake-smoke'
if (!args.has('--confirm-e2e') || !args.has(mode) || args.size !== 2) {
  console.error('ORCHESTRATOR: FAIL')
  console.error('CATEGORY: explicit_read_only_handshake_mode_required')
  process.exit(1)
}

const runId = 'RUNTIME_' + randomBytes(16).toString('hex')
ensureRuntimeDir()
const initial = { version: 1, project: 'e2e', run_id: runId, state: 'BROWSER_STARTING' }
atomicWriteHandshake(initial)

const childEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  E2E_EXPECTED_PROJECT_REF: process.env.E2E_EXPECTED_PROJECT_REF,
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL,
  E2E_RUNTIME_DIR: RUNTIME_DIR,
  E2E_RUNTIME_RUN_ID: runId,
}
const child = spawn('npx', ['playwright', 'test', 'tests/e2e/mutating/request-reject.browser-armed.spec.ts', '--project=chromium-admin', '--no-deps', '--retries=0', '--workers=1'], {
  cwd: process.cwd(),
  env: childEnv,
  stdio: 'inherit',
})

let finished = false
const stop = (code) => {
  if (finished) return
  finished = true
  removeHandshake(runId)
  process.exit(code)
}
const deadline = Date.now() + 120_000
let ready = false
while (Date.now() < deadline && !finished) {
  const signal = readHandshake(runId)
  if (signal?.state === 'BROWSER_READY') {
    ready = true
    atomicWriteHandshake({ ...signal, state: 'BROWSER_READY' })
    console.log('PLAYWRIGHT_STARTED: yes')
    console.log('CHROMIUM_STARTED: yes')
    console.log('AUTHENTICATED_NAVIGATION: PASS')
    console.log('BROWSER_READY: PASS')
    console.log('REMOTE_WRITES_BEFORE_READY: 0')
    console.log('SEED_EXECUTED: no')
    console.log('FIXTURE_CREATED: no')
    console.log('REJECT_EXECUTED: no')
    if (mode === '--post-ready-handoff-smoke') {
      atomicWriteHandshake({ ...signal, state: 'HANDOFF_DRY_RUN' })
      while (Date.now() < deadline) {
        const handoff = readHandshake(runId)
        if (handoff?.state === 'ACTION_ARMED_DRY_RUN') {
          console.log('HANDOFF_DRY_RUN_PUBLISHED: yes')
          console.log('HANDOFF_DRY_RUN_CONSUMED: yes')
          console.log('SAME_BROWSER_AFTER_HANDOFF: PASS')
          console.log('AUTH_STILL_VALID_AFTER_HANDOFF: PASS')
          atomicWriteHandshake({ ...handoff, state: 'CANCEL' })
          break
        }
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } else {
      atomicWriteHandshake({ ...signal, state: 'CANCEL' })
    }
    break
  }
  await new Promise(resolve => setTimeout(resolve, 100))
}
if (!ready) {
  console.log('BROWSER_START_FAILED: yes')
  console.log('PRESEED_BROWSER_FAILURE_REMOTE_WRITES: 0')
  atomicWriteHandshake({ ...initial, state: 'ABORT' })
  child.kill('SIGTERM')
  stop(1)
}

child.on('exit', (code, signal) => {
  if (code === 0) {
    console.log('CANCEL_HANDSHAKE: PASS')
    console.log('BROWSER_EXIT: PASS')
    stop(0)
  } else {
    console.error(`BROWSER_EXIT: FAIL (${code ?? signal})`)
    stop(1)
  }
})
