const transitions = {
  HARNESS_INIT: ['INSPECTOR_CONNECTED'],
  INSPECTOR_CONNECTED: ['DEBUGGER_ENABLED'],
  DEBUGGER_ENABLED: ['PRE_EVENT_VALIDATED'],
  PRE_EVENT_VALIDATED: ['TARGET_SCOPE_ARMED'],
  TARGET_SCOPE_ARMED: ['WAITING_FOR_THROW'],
  WAITING_FOR_THROW: ['TARGET_THROW_PAUSED', 'TARGET_NOT_OBSERVED', 'HARNESS_FAILURE'],
  TARGET_THROW_PAUSED: ['TARGET_FRAMES_CAPTURED'],
  TARGET_FRAMES_CAPTURED: ['TARGET_RESUMED'],
  TARGET_RESUMED: ['POST_EVENT_RESULT_AVAILABLE', 'POST_EVENT_ENVELOPE_UNAVAILABLE'],
  POST_EVENT_RESULT_AVAILABLE: ['FINAL_PROVENANCE_RESULT'],
  POST_EVENT_ENVELOPE_UNAVAILABLE: ['FINAL_PROVENANCE_RESULT'],
  TARGET_NOT_OBSERVED: ['FINAL_PROVENANCE_RESULT'],
  HARNESS_FAILURE: [],
  FINAL_PROVENANCE_RESULT: [],
}

export function createProvenanceState() {
  return { state: 'HARNESS_INIT', throwEvidence: null, envelope: null, error: null }
}

export function transition(state, next) {
  if (!transitions[state.state]?.includes(next)) {
    throw new Error('INVALID_PROVENANCE_STATE_TRANSITION')
  }
  return { ...state, state: next }
}

export function captureThrow(state, evidence) {
  const paused = transition(state, 'TARGET_THROW_PAUSED')
  return { ...paused, throwEvidence: { frameCount: evidence.frameCount ?? 0, originClass: evidence.originClass ?? 'UNKNOWN' } }
}

export function classifyFinalState(state) {
  if (state.state === 'HARNESS_FAILURE') return 'HARNESS_FAILURE'
  if (state.throwEvidence && !state.envelope) return 'THROW_CAPTURED_POST_EVENT_ENVELOPE_UNAVAILABLE'
  if (state.throwEvidence) return 'THROW_CAPTURED_WITH_POST_EVENT_ENVELOPE'
  if (state.state === 'TARGET_NOT_OBSERVED') return 'TARGET_THROW_NOT_OBSERVED'
  throw new Error('PROVENANCE_FINAL_STATE_INCOMPLETE')
}

export function requiredPreEventFields() {
  return ['freeze', 'networkKillSwitch', 'inspectorSession', 'debuggerEnabled', 'targetScope', 'redactionPolicy']
}
