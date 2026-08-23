import { RUNTIME_HANDSHAKE_TRANSITIONS, validateHandshakeTransition } from './lib/runtime-handshake.mjs'

const sequence = ['BROWSER_STARTING', 'BROWSER_READY', 'HANDOFF_DRY_RUN', 'ACTION_ARMED_DRY_RUN', 'CANCEL', 'CLEAN']
for (let index = 1; index < sequence.length; index += 1) {
  validateHandshakeTransition(sequence[index - 1], sequence[index])
}

let invalidDirectTransitionRejected = false
try {
  validateHandshakeTransition('BROWSER_READY', 'CANCEL')
} catch {
  invalidDirectTransitionRejected = true
}
if (!invalidDirectTransitionRejected) throw new Error('direct_browser_ready_cancel_must_fail')
if (RUNTIME_HANDSHAKE_TRANSITIONS.BROWSER_READY.includes('CANCEL')) throw new Error('invalid_transition_allowlisted')
console.log('BROWSER_READY_CANCEL_TRANSITION_REGRESSION_TEST: PASS')
console.log('CANONICAL_READ_ONLY_SEQUENCE_VALID: PASS')
