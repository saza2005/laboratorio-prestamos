import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { loadState, markCleanupComplete, markCleanupRunning } from './lib/mutating-state.mjs'

const args = new Set(process.argv.slice(2))
const execute = args.has('--execute')
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R2')) fail('missing_arguments')
if ([...args].some((arg) => !['--confirm-e2e', '--flow=FLOW-R2', '--execute'].includes(arg))) fail('unknown_argument')
if (execute && process.env.E2E_MUTATING_CONFIRM !== 'FLOW-R2-CLEANUP') fail('invalid_mutating_confirmation')
const state = loadState()
const flow = state.flows?.['FLOW-R2']
if (!flow) {
  if (execute) fail('no_active_flow')
  console.log('CLEANUP_MODE: DRY_RUN\nACTIVE_FLOW: none\nTARGETS: 0\nREMOTE_WRITES: 0')
  process.exit(0)
}
if (!flow.cleanup_required || flow.entities?.length !== 1 || !flow.request_id) fail('cleanup_state_not_exact')
const requestEntity = flow.entities[0]
if (requestEntity.type !== 'request' || requestEntity.namespace !== 'E2E_MUT_REQ_R2_') fail('request_target_not_allowlisted')
const admin = createAdminReadClient()
const requestResult = await admin.from('requests').select('id,user_id,status,purpose').eq('id', requestEntity.id).maybeSingle()
if (requestResult.error || !requestResult.data) fail('request_target_missing')
if (!['pending', 'rejected'].includes(requestResult.data.status)) fail('request_status_not_safe')
if (requestResult.data.purpose !== flow.correlation_marker) fail('request_marker_mismatch')
const childrenResult = await admin.from('request_items').select('id,request_id').eq('request_id', requestEntity.id)
if (childrenResult.error || (childrenResult.data ?? []).length !== 1) fail('request_children_not_exact')
const loansResult = await admin.from('loans').select('id').eq('request_id', requestEntity.id)
if (loansResult.error || (loansResult.data ?? []).length) fail('loan_association_blocks_cleanup')
if (!execute) {
  console.log('CLEANUP_MODE: DRY_RUN')
  console.log('ACTIVE_FLOW: FLOW-R2')
  console.log('TARGETS: 2')
  console.log('REQUEST_TARGETS: 1')
  console.log('REQUEST_ITEM_TARGETS: 1')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}
markCleanupRunning('FLOW-R2')
try {
  const child = await admin.from('request_items').delete().eq('id', childrenResult.data[0].id).select('id')
  if (child.error || (child.data ?? []).length !== 1) throw new Error('request_item_delete_failed')
  const request = await admin.from('requests').delete().eq('id', requestEntity.id).select('id')
  if (request.error || (request.data ?? []).length !== 1) throw new Error('request_delete_failed')
  markCleanupComplete('FLOW-R2')
} catch {
  fail('cleanup_failed_state_preserved')
}
console.log('CLEANUP_MODE: EXECUTE')
console.log('ACTIVE_FLOW: FLOW-R2')
console.log('REQUESTS_DELETED: 1')
console.log('REQUEST_ITEMS_DELETED: 1')
console.log('REMOTE_WRITES: 2')

function fail(code) {
  console.error('CLEANUP_MODE: FAIL')
  console.error('CATEGORY: ' + code)
  process.exit(1)
}
