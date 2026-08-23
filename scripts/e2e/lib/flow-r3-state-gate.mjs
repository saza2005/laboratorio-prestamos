const FLOW_ID = 'FLOW-R3'
const NAMESPACE = 'E2E_MUT_REQ_R3_'

export function validateFlowR3SeededState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('invalid_state')
  if (state.active_flow !== FLOW_ID) throw new Error('invalid_active_flow')
  const flow = state.flows?.[FLOW_ID]
  if (!flow || typeof flow !== 'object') throw new Error('missing_flow')
  if (flow.namespace !== NAMESPACE) throw new Error('invalid_namespace')
  if (typeof flow.request_id !== 'string' || flow.request_id.length === 0) throw new Error('missing_request_id')
  if (flow.remote_write_confirmed !== true) throw new Error('remote_write_not_confirmed')
  if (flow.cleanup_required !== true) throw new Error('cleanup_not_required')
  if (typeof flow.correlation_marker !== 'string' || !flow.correlation_marker.startsWith(NAMESPACE)) throw new Error('missing_correlation_marker')
  if (flow.owner_role !== 'student' || flow.reviewer_role !== 'admin') throw new Error('invalid_actor_contract')
  return flow
}
