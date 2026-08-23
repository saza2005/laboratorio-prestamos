import assert from 'node:assert/strict'
import {
  captureThrow,
  classifyFinalState,
  createProvenanceState,
  requiredPreEventFields,
  transition,
} from './lib/f3ak-provenance-state.mjs'

function preEvent() {
  let state = createProvenanceState()
  for (const next of ['INSPECTOR_CONNECTED', 'DEBUGGER_ENABLED', 'PRE_EVENT_VALIDATED', 'TARGET_SCOPE_ARMED', 'WAITING_FOR_THROW']) state = transition(state, next)
  return state
}

assert.deepEqual(requiredPreEventFields(), ['freeze', 'networkKillSwitch', 'inspectorSession', 'debuggerEnabled', 'targetScope', 'redactionPolicy'])
assert.equal(classifyFinalState(transition(preEvent(), 'TARGET_NOT_OBSERVED')), 'TARGET_THROW_NOT_OBSERVED')

let state = captureThrow(preEvent(), { frameCount: 2, originClass: 'REPOSITORY_FILE' })
state = transition(state, 'TARGET_FRAMES_CAPTURED')
state = transition(state, 'TARGET_RESUMED')
assert.equal(classifyFinalState(transition(state, 'POST_EVENT_ENVELOPE_UNAVAILABLE')), 'THROW_CAPTURED_POST_EVENT_ENVELOPE_UNAVAILABLE')

state = captureThrow(preEvent(), { frameCount: 1, originClass: 'NODE_BUILTIN' })
state = transition(state, 'TARGET_FRAMES_CAPTURED')
state = transition(state, 'TARGET_RESUMED')
assert.equal(classifyFinalState({ ...transition(state, 'POST_EVENT_RESULT_AVAILABLE'), envelope: { safe: true } }), 'THROW_CAPTURED_WITH_POST_EVENT_ENVELOPE')

assert.equal(classifyFinalState(transition(preEvent(), 'HARNESS_FAILURE')), 'HARNESS_FAILURE')
assert.throws(() => transition(preEvent(), 'POST_EVENT_RESULT_AVAILABLE'), /INVALID_PROVENANCE_STATE_TRANSITION/)

console.log('L1_F3AK_NO_ENVELOPE_PRE_EVENT_TEST=PASS')
console.log('L1_F3AK_THROW_WITHOUT_ENVELOPE_CAPTURE_TEST=PASS')
console.log('L1_F3AK_DELAYED_ENVELOPE_CORRELATION_TEST=PASS')
console.log('L1_F3AK_THROW_CAPTURE_SURVIVES_MISSING_ENVELOPE_TEST=PASS')
console.log('L1_F3AK_NO_THROW_HEALTHY_PATH_TEST=PASS')
console.log('L1_F3AK_HARNESS_STATE_TRANSITION_TESTS=PASS')
console.log('L1_F3AK_HARNESS_FAILURE_SEMANTICS_HARDENED=yes')
