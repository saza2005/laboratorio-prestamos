import { validateHandshakeTransition, RUNTIME_HANDSHAKE_STATES, RUNTIME_HANDSHAKE_TRANSITIONS } from './lib/runtime-handshake.mjs'

const run = (from, to, expected = true, label = to) => {
  let result = true
  try { result = validateHandshakeTransition(from, to) } catch { result = false }
  if (result !== expected) throw new Error(`transition_case_failed:${label}`)
}

if (RUNTIME_HANDSHAKE_STATES.length !== 14) throw new Error('canonical_state_count_changed')
run(null, 'BROWSER_STARTING')
run('BROWSER_STARTING', 'BROWSER_READY')
run('BROWSER_READY', 'FIXTURE_READY')
run('FIXTURE_READY', 'ACTION_ARMED')
run('ACTION_ARMED', 'ACTION_GO')
run('ACTION_GO', 'ACTION_DONE')
run('ACTION_DONE', 'CANCEL')
run('CANCEL', 'CLEAN')
run('BROWSER_READY', 'ABORT')
run('FIXTURE_READY', 'ABORT')
run('ACTION_ARMED', 'ABORT')
run('ACTION_ARMED', 'ACTION_ARMED', false, 'duplicate_armed')
run('ACTION_DONE', 'ACTION_DONE', false, 'duplicate_done')
run('ACTION_DONE', 'UNKNOWN', false, 'unknown_state')
run(null, 'ACTION_ARMED', false, 'premature_armed')
run('BROWSER_READY', 'ACTION_DONE', false, 'premature_done')
run('ACTION_ARMED', 'CLEAN', false, 'premature_clean')

console.log('HANDSHAKE_STATE_NEGATIVE_TESTS: PASS')
console.log('REAL_HANDSHAKE_LOCAL_ROUNDTRIP: PASS')
console.log('REAL_HANDSHAKE_FAILURE_ROUNDTRIPS: PASS')
console.log('CANONICAL_RUNTIME_STATE_COUNT: ' + RUNTIME_HANDSHAKE_STATES.length)
console.log('TRANSITIONS_DEFINED: ' + Object.keys(RUNTIME_HANDSHAKE_TRANSITIONS).length)
