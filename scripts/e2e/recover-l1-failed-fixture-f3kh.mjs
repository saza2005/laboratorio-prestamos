import fs from 'node:fs'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

function fail(code) {
  console.error(`L1_F3KH_RECOVERY: FAIL_CLOSED (${code})`)
  process.exitCode = 1
  throw new Error(code)
}

function requireProof(condition, code) {
  if (!condition) fail(code)
}

try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }

const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
const expectedRef = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
const publicUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
requireProof(expectedRef && publicUrl.startsWith(`https://${expectedRef}.supabase.co`), 'project_identity')
requireProof(snapshot.requestCreateAttempt === 1, 'request_creation_not_confirmed')
requireProof(snapshot.approvalAttempt === 1, 'approval_not_confirmed')
requireProof(snapshot.deliveryAttempt === 0, 'delivery_attempt_not_zero')
requireProof(snapshot.cleanupAttempt === 1, 'cleanup_attempt_not_confirmed')
requireProof(snapshot.remoteWriteConfirmed === true && snapshot.fixtureReady === true, 'fixture_ready_not_confirmed')
requireProof(snapshot.requestId && snapshot.requestItemId && snapshot.ownershipToken, 'snapshot_ownership_missing')
requireProof(snapshot.referenceIds?.itemId && snapshot.referenceIds?.studentId && snapshot.itemBefore, 'snapshot_reference_missing')

const admin = createAdminReadClient()
async function readSingle(query, code) {
  const result = await query
  requireProof(!result.error, code)
  return result.data
}

const request = await readSingle(
  admin.from('requests').select('id,user_id,status,purpose,e2e_fixture_token').eq('id', snapshot.requestId).maybeSingle(),
  'request_read_failed'
)
const items = await readSingle(
  admin.from('request_items').select('id,request_id,item_id,quantity_requested,quantity_approved,quantity_delivered').eq('request_id', snapshot.requestId),
  'request_items_read_failed'
)
const loans = await readSingle(
  admin.from('loans').select('id,request_id,user_id,status,delivered_by').eq('request_id', snapshot.requestId),
  'loans_read_failed'
)
const groups = await readSingle(
  admin.from('request_groups').select('id,request_id').eq('request_id', snapshot.requestId),
  'request_groups_read_failed'
)
const item = await readSingle(
  admin.from('items').select('id,track_individual,stock_available').eq('id', snapshot.referenceIds.itemId).maybeSingle(),
  'item_read_failed'
)
const units = await readSingle(
  admin.from('item_units').select('id,item_id').eq('item_id', snapshot.referenceIds.itemId),
  'item_units_read_failed'
)
const movements = await readSingle(
  admin.from('inventory_movements').select('id,item_id,movement_type,reference_table,reference_id').eq('item_id', snapshot.referenceIds.itemId),
  'inventory_movements_read_failed'
)
const returns = loans.length
  ? await readSingle(admin.from('returns').select('id,loan_id').in('loan_id', loans.map((loan) => loan.id)), 'returns_read_failed')
  : []
const groupItems = groups.length
  ? await readSingle(admin.from('request_group_items').select('id,request_group_id').in('request_group_id', groups.map((group) => group.id)), 'request_group_items_read_failed')
  : []

requireProof(request && request.id === snapshot.requestId, 'request_missing')
requireProof(request.user_id === snapshot.referenceIds.studentId, 'request_owner_mismatch')
requireProof(request.e2e_fixture_token === snapshot.ownershipToken, 'request_token_mismatch')
requireProof(request.purpose === snapshot.purpose && request.status === 'approved', 'request_state_mismatch')
requireProof(items.length === 1, 'request_item_cardinality')
requireProof(items[0].id === snapshot.requestItemId && items[0].request_id === snapshot.requestId, 'request_item_owner_mismatch')
requireProof(items[0].item_id === snapshot.referenceIds.itemId && items[0].quantity_requested === 1 && items[0].quantity_approved === 1 && items[0].quantity_delivered === 0, 'request_item_state_mismatch')
requireProof(loans.length === 0 && groups.length === 0 && groupItems.length === 0, 'business_graph_present')
requireProof(returns.length === 0 && movements.length === 0 && units.length === 0, 'delivery_graph_present')
requireProof(item && item.id === snapshot.referenceIds.itemId && item.track_individual === false, 'item_state_mismatch')
requireProof(item.stock_available === snapshot.itemBefore.stock_available, 'stock_state_mismatch')

async function deleteExactly(table, predicates, code) {
  let query = admin.from(table).delete().select('id')
  for (const [key, value] of Object.entries(predicates)) query = query.eq(key, value)
  const result = await query
  requireProof(!result.error && (result.data ?? []).length === 1, code)
}

await deleteExactly('request_items', { id: snapshot.requestItemId, request_id: snapshot.requestId }, 'request_item_delete_failed')
await deleteExactly('requests', { id: snapshot.requestId, e2e_fixture_token: snapshot.ownershipToken }, 'request_delete_failed')
console.log('L1_F3KH_RECOVERY: PASS_CLOSED_APPROVED_PREDELIVERY_RESIDUAL_REMOVED')
