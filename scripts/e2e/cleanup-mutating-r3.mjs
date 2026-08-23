import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { loadState, markCleanupComplete, markCleanupRunning } from './lib/mutating-state.mjs'

const args = new Set(process.argv.slice(2))
const execute = args.has('--execute')
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R3')) fail('missing_arguments')
if (execute && process.env.E2E_MUTATING_CONFIRM !== 'FLOW-R3-CLEANUP') fail('invalid_mutating_confirmation')
if ([...args].some((arg) => !['--confirm-e2e', '--flow=FLOW-R3', '--execute'].includes(arg))) fail('unknown_argument')
const state = loadState()
const flow = state.flows?.['FLOW-R3']
if (!flow) {
  if (execute) fail('no_active_flow')
  console.log('CLEANUP_MODE: DRY_RUN\nACTIVE_FLOW: none\nTARGETS: 0\nREMOTE_WRITES: 0')
  process.exit(0)
}
if (!flow.cleanup_required || flow.entities?.length !== 1 || !flow.request_id || flow.entities[0].type !== 'request' || flow.entities[0].namespace !== 'E2E_MUT_REQ_R3_') fail('cleanup_state_not_exact')
const admin = createAdminReadClient()
const request = await admin.from('requests').select('id,status,purpose').eq('id', flow.request_id).maybeSingle()
if (request.error || !request.data || !['pending', 'approved'].includes(request.data.status) || request.data.purpose !== flow.correlation_marker) fail('request_target_not_safe')
const children = await admin.from('request_items').select('id,request_id').eq('request_id', flow.request_id)
if (children.error || children.data?.length !== 1 || children.data[0].request_id !== flow.request_id) fail('request_children_not_exact')
const groups = await admin.from('request_groups').select('id').eq('request_id', flow.request_id)
if (groups.error || groups.data?.length) fail('grouped_request_not_supported')
const loans = await admin.from('loans').select('id').eq('request_id', flow.request_id)
if (loans.error || loans.data?.length) fail('loan_association_blocks_cleanup')
if (!execute) {
  console.log('CLEANUP_MODE: DRY_RUN\nACTIVE_FLOW: FLOW-R3\nTARGETS: 2\nREQUEST_TARGETS: 1\nREQUEST_ITEM_TARGETS: 1\nREMOTE_WRITES: 0')
  process.exit(0)
}
markCleanupRunning('FLOW-R3')
try {
  const child = await admin.from('request_items').delete().eq('id', children.data[0].id).select('id')
  if (child.error || child.data?.length !== 1) throw new Error('request_item_delete_failed')
  const deleted = await admin.from('requests').delete().eq('id', flow.request_id).select('id')
  if (deleted.error || deleted.data?.length !== 1) throw new Error('request_delete_failed')
  markCleanupComplete('FLOW-R3')
} catch { fail('cleanup_failed_state_preserved') }
console.log('CLEANUP_MODE: EXECUTE\nACTIVE_FLOW: FLOW-R3\nREQUESTS_DELETED: 1\nREQUEST_ITEMS_DELETED: 1\nREMOTE_WRITES: 2')

function fail(code) { console.error('CLEANUP_MODE: FAIL\nCATEGORY: ' + code); process.exit(1) }
