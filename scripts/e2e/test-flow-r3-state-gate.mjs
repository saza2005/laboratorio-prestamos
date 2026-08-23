import { validateFlowR3SeededState } from './lib/flow-r3-state-gate.mjs'

const base = { active_flow: 'FLOW-R3', flows: { 'FLOW-R3': { namespace: 'E2E_MUT_REQ_R3_', request_id: 'local-id', remote_write_confirmed: true, cleanup_required: true, correlation_marker: 'E2E_MUT_REQ_R3_marker', owner_role: 'student', reviewer_role: 'admin' } } }
validateFlowR3SeededState(base)
for (const [name, change] of [['remote_false', { remote_write_confirmed: false }], ['missing_id', { request_id: null }], ['cleanup_false', { cleanup_required: false }], ['wrong_flow', { owner_role: 'teacher' }]]) {
  try { validateFlowR3SeededState({ ...base, flows: { 'FLOW-R3': { ...base.flows['FLOW-R3'], ...change } } }); throw new Error(name + '_accepted') } catch (error) { if (error.message === name + '_accepted') throw error }
}
console.log('R3_STATE_GATE_LOCAL_TESTS: PASS')
