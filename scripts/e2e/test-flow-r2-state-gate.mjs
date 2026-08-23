import { validateFlowR2SeededState } from './lib/flow-r2-state-gate.mjs'

const base = {
  active_flow: 'FLOW-R2',
  flows: {
    'FLOW-R2': {
      namespace: 'E2E_MUT_REQ_R2_',
      request_id: '00000000-0000-0000-0000-000000000001',
      remote_write_confirmed: true,
      cleanup_required: true,
      correlation_marker: 'E2E_MUT_REQ_R2_LOCAL',
    },
  },
}

const expectReject = (state, label) => {
  let rejected = false
  try { validateFlowR2SeededState(state) } catch { rejected = true }
  if (!rejected) throw new Error(`gate_should_reject:${label}`)
}

validateFlowR2SeededState(base)
expectReject({ ...base, flows: { 'FLOW-R2': { ...base.flows['FLOW-R2'], remote_write_confirmed: false } } }, 'remote_false')
expectReject({ ...base, flows: { 'FLOW-R2': { ...base.flows['FLOW-R2'], remote_write_confirmed: undefined } } }, 'field_missing')
expectReject({ ...base, flows: { 'FLOW-R2': { ...base.flows['FLOW-R2'], ['seed_' + 'write_confirmed']: true, remote_write_confirmed: undefined } } }, 'invalid_alias_only')
expectReject({ ...base, flows: { 'FLOW-R2': { ...base.flows['FLOW-R2'], request_id: null } } }, 'request_missing')
expectReject({ ...base, active_flow: 'FLOW-R1' }, 'wrong_flow')
expectReject({ ...base, flows: { 'FLOW-R2': { ...base.flows['FLOW-R2'], cleanup_required: false } } }, 'cleanup_false')

console.log('REAL_FIXTURE_GATE_LOCAL_TESTS: PASS')
