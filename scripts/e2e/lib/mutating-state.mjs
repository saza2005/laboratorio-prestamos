import fs from 'node:fs'
import path from 'node:path'

export const STATE_PATH = path.resolve('.e2e-state/mutating-tests.json')
export const ALLOWED_FLOWS = new Set(['FLOW-R1','FLOW-R2','FLOW-R3'])
export const FLOW_NAMESPACES = Object.freeze({ 'FLOW-R1': 'E2E_MUT_REQ_R1_', 'FLOW-R2': 'E2E_MUT_REQ_R2_', 'FLOW-R3': 'E2E_MUT_REQ_R3_' })
export const ALLOWED_ENTITY_TYPES = new Set(['request','request_item','request_group','request_group_item','loan','loan_item','return','return_item','maintenance_record','item','item_unit','inventory_movement'])

export function emptyState() { return { version: 1, project: 'e2e', active_flow: null, flows: {} } }
function fail(message) { throw new Error(message) }

export function validateState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalid_state')
  if (input.version !== 1 || input.project !== 'e2e') fail('invalid_state_header')
  if (input.active_flow !== null && !ALLOWED_FLOWS.has(input.active_flow)) fail('invalid_active_flow')
  if (!input.flows || typeof input.flows !== 'object' || Array.isArray(input.flows)) fail('invalid_flows')
  for (const [flowId, flow] of Object.entries(input.flows)) {
    if (!ALLOWED_FLOWS.has(flowId) || !flow || typeof flow !== 'object') fail('invalid_flow_record')
    if (flow.namespace !== FLOW_NAMESPACES[flowId]) fail('invalid_flow_namespace')
    if (!['IDLE','PREPARED_WITH_CORRELATION','RUNNING_NO_WRITE','WRITE_CONFIRMED','VERIFY_FAILED','CLEANUP_REQUIRED','CLEANUP_RUNNING','CLEAN','CLEANUP_FAILED'].includes(flow.status)) fail('invalid_flow_status')
    if (!Array.isArray(flow.entities)) fail('invalid_flow_entities')
    if (flow.correlation_marker !== undefined && (typeof flow.correlation_marker !== 'string' || !flow.correlation_marker.startsWith(flow.namespace))) fail('invalid_correlation_marker')
    if (flow.request_id !== undefined && flow.request_id !== null && typeof flow.request_id !== 'string') fail('invalid_request_id')
    for (const entity of flow.entities) {
      if (!entity || typeof entity !== 'object') fail('invalid_entity')
      if (!ALLOWED_ENTITY_TYPES.has(entity.type)) fail('entity_type_not_allowlisted')
      if (typeof entity.id !== 'string' || !entity.id || /\s/.test(entity.id)) fail('invalid_entity_id')
      if (entity.namespace !== flow.namespace) fail('entity_namespace_mismatch')
    }
  }
  if (input.active_flow && !input.flows[input.active_flow]) fail('active_flow_missing')
  return input
}

export function loadState() {
  if (!fs.existsSync(STATE_PATH)) return emptyState()
  return validateState(JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')))
}

export function atomicWrite(state) {
  validateState(state)
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true, mode: 0o700 })
  const temp = STATE_PATH + '.tmp-' + process.pid
  fs.writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })
  fs.chmodSync(temp, 0o600)
  fs.renameSync(temp, STATE_PATH)
  fs.chmodSync(STATE_PATH, 0o600)
}

export function registerFlow(flowId, metadata = {}) {
  if (!ALLOWED_FLOWS.has(flowId)) fail('flow_not_allowlisted')
  const state = loadState()
  if (state.active_flow || Object.keys(state.flows).length) fail('state_not_clean')
  if (metadata.correlation_marker && !metadata.correlation_marker.startsWith(FLOW_NAMESPACES[flowId])) fail('invalid_correlation_marker')
  state.active_flow = flowId
  state.flows[flowId] = {
    namespace: FLOW_NAMESPACES[flowId],
    status: 'RUNNING_NO_WRITE',
    entities: [],
    cleanup_required: false,
    request_id: null,
    remote_write_confirmed: false,
    ...metadata,
  }
  atomicWrite(state)
  return state
}

export function registerCreatedEntity(flowId, type, id) {
  if (!ALLOWED_FLOWS.has(flowId) || !ALLOWED_ENTITY_TYPES.has(type)) fail('entity_not_allowlisted')
  if (typeof id !== 'string' || !id || /\s/.test(id)) fail('invalid_entity_id')
  const state = loadState()
  const flow = state.flows[flowId]
  if (!flow || state.active_flow !== flowId) fail('flow_not_active')
  if (flow.entities.some((entity) => entity.id === id)) fail('duplicate_entity_id')
  flow.entities.push({ type, id, namespace: flow.namespace })
  flow.status = 'WRITE_CONFIRMED'
  flow.cleanup_required = true
  flow.remote_write_confirmed = true
  if (type === 'request') flow.request_id = id
  atomicWrite(state)
  return state
}

export function markCleanupRequired(flowId) {
  const state = loadState()
  const flow = state.flows[flowId]
  if (!flow) fail('flow_not_found')
  flow.status = 'CLEANUP_REQUIRED'
  flow.cleanup_required = true
  atomicWrite(state)
  return state
}

export function markCleanupRunning(flowId) {
  const state = loadState()
  const flow = state.flows[flowId]
  if (!flow || !flow.cleanup_required) fail('cleanup_not_required')
  flow.status = 'CLEANUP_RUNNING'
  atomicWrite(state)
  return state
}

export function markCleanupComplete(flowId) {
  const state = loadState()
  const flow = state.flows[flowId]
  if (!flow) fail('cleanup_not_complete')
  flow.status = 'CLEAN'
  flow.cleanup_required = false
  atomicWrite(state)
  return state
}

export function clearCompletedFlow(flowId) {
  const state = loadState()
  const flow = state.flows[flowId]
  if (!flow || flow.status !== 'CLEAN' || flow.cleanup_required) fail('flow_not_clean')
  delete state.flows[flowId]
  if (state.active_flow === flowId) state.active_flow = null
  atomicWrite(state)
  return state
}
