import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export const RUNTIME_DIR = path.resolve('.e2e-state/runtime')
export const HANDSHAKE_VERSION = 1
export const RUNTIME_HANDSHAKE_STATES = Object.freeze([
  'IDLE', 'BROWSER_STARTING', 'BROWSER_READY', 'HANDOFF_DRY_RUN', 'ACTION_ARMED_DRY_RUN',
  'FIXTURE_WAIT', 'FIXTURE_READY', 'ACTION_ARMED', 'ACTION_GO', 'ACTION_RUNNING',
  'ACTION_DONE', 'CANCEL', 'ABORT', 'CLEAN',
])

export const RUNTIME_HANDSHAKE_TRANSITIONS = Object.freeze({
  IDLE: ['BROWSER_STARTING', 'CLEAN'],
  BROWSER_STARTING: ['BROWSER_READY', 'ABORT'],
  BROWSER_READY: ['HANDOFF_DRY_RUN', 'FIXTURE_WAIT', 'FIXTURE_READY', 'ABORT'],
  HANDOFF_DRY_RUN: ['ACTION_ARMED_DRY_RUN', 'ABORT'],
  ACTION_ARMED_DRY_RUN: ['CANCEL', 'ABORT'],
  FIXTURE_WAIT: ['FIXTURE_READY', 'ABORT'],
  FIXTURE_READY: ['ACTION_ARMED', 'ABORT'],
  ACTION_ARMED: ['ACTION_GO', 'ACTION_RUNNING', 'ACTION_DONE', 'CANCEL', 'ABORT'],
  ACTION_GO: ['ACTION_DONE', 'ACTION_RUNNING', 'CANCEL', 'ABORT'],
  ACTION_RUNNING: ['ACTION_DONE', 'CANCEL', 'ABORT'],
  ACTION_DONE: ['CANCEL', 'CLEAN'],
  CANCEL: ['CLEAN'],
  ABORT: ['CLEAN'],
  CLEAN: [],
})

const allowedStates = new Set(RUNTIME_HANDSHAKE_STATES)

function fail(message) { throw new Error(message) }
function file(runId) { return path.join(RUNTIME_DIR, runId + '.json') }
function validRunId(runId) { return typeof runId === 'string' && /^RUNTIME_[0-9a-f]{32}$/.test(runId) }

export function validateHandshakeTransition(fromState, toState) {
  if (!allowedStates.has(toState)) fail('invalid_handshake_state')
  if (fromState === null || fromState === undefined) return toState === 'BROWSER_STARTING'
  if (!allowedStates.has(fromState)) fail('invalid_previous_handshake_state')
  if (!RUNTIME_HANDSHAKE_TRANSITIONS[fromState]?.includes(toState)) fail('invalid_handshake_transition')
  return true
}

export function validateHandshake(value, expectedRunId) {
  if (!value || value.version !== HANDSHAKE_VERSION || value.project !== 'e2e') fail('invalid_handshake')
  if (!validRunId(value.run_id) || value.run_id !== expectedRunId) fail('stale_or_invalid_run_id')
  if (!allowedStates.has(value.state)) fail('invalid_handshake_state')
  return value
}

export function ensureRuntimeDir() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true, mode: 0o700 })
  fs.chmodSync(RUNTIME_DIR, 0o700)
}

export function atomicWriteHandshake(value) {
  ensureRuntimeDir()
  validateHandshake(value, value.run_id)
  const target = file(value.run_id)
  if (fs.existsSync(target)) {
    const previous = JSON.parse(fs.readFileSync(target, 'utf8'))
    validateHandshake(previous, value.run_id)
    validateHandshakeTransition(previous.state, value.state)
  } else {
    validateHandshakeTransition(null, value.state)
  }
  const temp = target + '.tmp-' + process.pid
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
  fs.chmodSync(temp, 0o600)
  fs.renameSync(temp, target)
  fs.chmodSync(target, 0o600)
}

export function readHandshake(runId) {
  const target = file(runId)
  if (!fs.existsSync(target)) return null
  return validateHandshake(JSON.parse(fs.readFileSync(target, 'utf8')), runId)
}

export function removeHandshake(runId) {
  const target = file(runId)
  if (fs.existsSync(target)) fs.unlinkSync(target)
  const tempPrefix = runId + '.json.tmp-'
  for (const entry of fs.readdirSync(RUNTIME_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.startsWith(tempPrefix)) fs.unlinkSync(path.join(RUNTIME_DIR, entry.name))
  }
}

export function makeRunId() {
  const random = randomBytes(16).toString('hex')
  return 'RUNTIME_' + random
}
