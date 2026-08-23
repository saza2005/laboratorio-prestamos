import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'

function fail(code) {
  console.error(`L1_F3KI_RECOVERY: FAIL_CLOSED (${code})`)
  process.exitCode = 1
  throw new Error(code)
}

function requireProof(condition, code) {
  if (!condition) fail(code)
}

function ids(rows) {
  return new Set((rows ?? []).map((row) => row.id))
}

async function read(query, code) {
  const result = await query
  requireProof(!result.error, code)
  return result.data
}

try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }

const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
const expectedRef = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
const publicUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
requireProof(expectedRef && publicUrl.startsWith(`https://${expectedRef}.supabase.co`), 'project_identity')
requireProof(snapshot.flow === 'FLOW-L1', 'flow_mismatch')
requireProof(snapshot.requestCreateAttempt === 1 && snapshot.approvalAttempt === 1, 'fixture_attempt_not_confirmed')
requireProof(snapshot.deliveryAttempt === 0 && snapshot.cleanupAttempt === 1, 'attempt_state_invalid')
requireProof(snapshot.remoteWriteConfirmed === true && snapshot.fixtureReady === true, 'fixture_ready_not_confirmed')
requireProof(snapshot.requestId && snapshot.requestItemId && snapshot.ownershipToken, 'ownership_metadata_missing')
requireProof(snapshot.referenceIds?.studentId && snapshot.referenceIds?.itemId && snapshot.itemBefore, 'reference_metadata_missing')

const admin = createAdminReadClient()

// Read the complete owned graph and the item baselines before any mutation.
const request = await read(
  admin.from('requests').select('id,user_id,status,purpose,e2e_fixture_token').eq('id', snapshot.requestId).maybeSingle(),
  'request_read_failed',
)
const requestItems = await read(
  admin.from('request_items').select('id,request_id,item_id,quantity_requested,quantity_approved,quantity_delivered').eq('request_id', snapshot.requestId),
  'request_items_read_failed',
)
const requestGroups = await read(
  admin.from('request_groups').select('id,request_id').eq('request_id', snapshot.requestId),
  'request_groups_read_failed',
)
const groupItems = requestGroups.length
  ? await read(admin.from('request_group_items').select('id,request_group_id').in('request_group_id', requestGroups.map((row) => row.id)), 'request_group_items_read_failed')
  : []
const loans = await read(
  admin.from('loans').select('id,request_id,user_id,status,delivered_by').eq('request_id', snapshot.requestId),
  'loans_read_failed',
)
const loanItems = loans.length
  ? await read(admin.from('loan_items').select('id,loan_id,item_id,item_unit_id,quantity,returned_quantity,damaged_quantity,missing_quantity').in('loan_id', loans.map((row) => row.id)), 'loan_items_read_failed')
  : []
const loanGroups = loans.length
  ? await read(admin.from('loan_groups').select('id,loan_id').in('loan_id', loans.map((row) => row.id)), 'loan_groups_read_failed')
  : []
const loanGroupItems = loanGroups.length
  ? await read(admin.from('loan_group_items').select('id,loan_group_id').in('loan_group_id', loanGroups.map((row) => row.id)), 'loan_group_items_read_failed')
  : []
const returns = loans.length
  ? await read(admin.from('returns').select('id,loan_id').in('loan_id', loans.map((row) => row.id)), 'returns_read_failed')
  : []
const item = await read(
  admin.from('items').select('id,track_individual,stock_available').eq('id', snapshot.referenceIds.itemId).maybeSingle(),
  'item_read_failed',
)
const units = await read(
  admin.from('item_units').select('id,item_id').eq('item_id', snapshot.referenceIds.itemId),
  'item_units_read_failed',
)
const movements = await read(
  admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id').eq('item_id', snapshot.referenceIds.itemId),
  'inventory_movements_read_failed',
)

const baselineMovementIds = ids(snapshot.movementsBefore)
const baselineUnitIds = ids(snapshot.unitsBefore)
const newMovements = movements.filter((row) => !baselineMovementIds.has(row.id))
const newUnits = units.filter((row) => !baselineUnitIds.has(row.id))
const ownedRequest = request && request.id === snapshot.requestId && request.user_id === snapshot.referenceIds.studentId && request.purpose === snapshot.purpose && request.e2e_fixture_token === snapshot.ownershipToken
const exactItem = requestItems.length === 1 && requestItems[0].id === snapshot.requestItemId && requestItems[0].request_id === snapshot.requestId && requestItems[0].item_id === snapshot.referenceIds.itemId && requestItems[0].quantity_requested === 1
const noIncompatibleGraph = requestGroups.length === 0 && groupItems.length === 0 && loanGroups.length === 0 && loanGroupItems.length === 0 && returns.length === 0 && newUnits.length === 0
const baselineStock = item && item.id === snapshot.referenceIds.itemId && item.track_individual === false
const approvedPredelivery = ownedRequest && request.status === 'approved' && exactItem && requestItems[0].quantity_approved === 1 && requestItems[0].quantity_delivered === 0 && loans.length === 0 && loanItems.length === 0 && newMovements.length === 0 && baselineStock && item.stock_available === snapshot.itemBefore.stock_available && noIncompatibleGraph
const deliveredLoan = loans.length === 1 ? loans[0] : null
const deliveredLoanItem = loanItems.length === 1 ? loanItems[0] : null
const deliveredMovement = newMovements.length === 1 ? newMovements[0] : null
const fullyDelivered = ownedRequest && request.status === 'delivered' && exactItem && requestItems[0].quantity_approved === 1 && requestItems[0].quantity_delivered === 1 && deliveredLoan && deliveredLoan.request_id === snapshot.requestId && deliveredLoan.user_id === snapshot.referenceIds.studentId && deliveredLoan.status === 'active' && deliveredLoanItem && deliveredLoanItem.loan_id === deliveredLoan.id && deliveredLoanItem.item_id === snapshot.referenceIds.itemId && deliveredLoanItem.item_unit_id === null && deliveredLoanItem.quantity === 1 && deliveredLoanItem.returned_quantity === 0 && deliveredLoanItem.damaged_quantity === 0 && deliveredLoanItem.missing_quantity === 0 && deliveredMovement && deliveredMovement.movement_type === 'loan_out' && deliveredMovement.quantity === 1 && deliveredMovement.reference_table === 'loans' && deliveredMovement.reference_id === deliveredLoan.id && baselineStock && item.stock_available === snapshot.itemBefore.stock_available - 1 && noIncompatibleGraph

let classification
if (!request && requestItems.length === 0 && loans.length === 0 && requestGroups.length === 0) classification = 'NO_FIXTURE_PRESENT'
else if (approvedPredelivery) classification = 'APPROVED_PREDELIVERY_OWNED_RESIDUAL'
else if (fullyDelivered) classification = 'FULLY_DELIVERED_MINIMAL_BULK_OWNED_RESIDUAL'
else fail('unexpected_or_ambiguous_owned_graph')

async function deleteExactly(table, predicates, code) {
  let query = admin.from(table).delete().select('id')
  for (const [key, value] of Object.entries(predicates)) query = query.eq(key, value)
  const result = await query
  requireProof(!result.error && (result.data ?? []).length === 1, code)
}

if (classification === 'APPROVED_PREDELIVERY_OWNED_RESIDUAL') {
  await deleteExactly('request_items', { id: snapshot.requestItemId, request_id: snapshot.requestId }, 'request_item_delete_failed')
  await deleteExactly('requests', { id: snapshot.requestId, e2e_fixture_token: snapshot.ownershipToken }, 'request_delete_failed')
} else if (classification === 'FULLY_DELIVERED_MINIMAL_BULK_OWNED_RESIDUAL') {
  const restored = await admin.from('items').update({ stock_available: snapshot.itemBefore.stock_available }).eq('id', snapshot.referenceIds.itemId).eq('stock_available', snapshot.itemBefore.stock_available - 1).select('id')
  requireProof(!restored.error && (restored.data ?? []).length === 1, 'stock_restore_failed')
  await deleteExactly('inventory_movements', { id: deliveredMovement.id, item_id: snapshot.referenceIds.itemId, reference_id: deliveredLoan.id }, 'movement_delete_failed')
  await deleteExactly('loan_items', { id: deliveredLoanItem.id, loan_id: deliveredLoan.id }, 'loan_item_delete_failed')
  await deleteExactly('loans', { id: deliveredLoan.id, request_id: snapshot.requestId }, 'loan_delete_failed')
  await deleteExactly('request_items', { id: snapshot.requestItemId, request_id: snapshot.requestId }, 'request_item_delete_failed')
  await deleteExactly('requests', { id: snapshot.requestId, e2e_fixture_token: snapshot.ownershipToken }, 'request_delete_failed')
}

const postRequest = await read(admin.from('requests').select('id').eq('id', snapshot.requestId).maybeSingle(), 'post_request_read_failed')
const postItems = await read(admin.from('request_items').select('id').eq('request_id', snapshot.requestId), 'post_request_items_read_failed')
const postLoans = await read(admin.from('loans').select('id').eq('request_id', snapshot.requestId), 'post_loans_read_failed')
const postLoanItems = deliveredLoan
  ? await read(admin.from('loan_items').select('id').eq('loan_id', deliveredLoan.id), 'post_loan_items_read_failed')
  : []
const postMovements = deliveredLoan
  ? await read(admin.from('inventory_movements').select('id').eq('reference_table', 'loans').eq('reference_id', deliveredLoan.id), 'post_movement_read_failed')
  : []
const postItem = await read(admin.from('items').select('id,stock_available').eq('id', snapshot.referenceIds.itemId).maybeSingle(), 'post_item_read_failed')
requireProof(!postRequest && postItems.length === 0 && postLoans.length === 0 && postLoanItems.length === 0 && postMovements.length === 0, 'post_owned_graph_not_absent')
requireProof(postItem && postItem.stock_available === snapshot.itemBefore.stock_available, 'post_stock_not_restored')
console.log(`L1_F3KI_RECOVERY: PASS ${classification} MUTATION_COMPLETE POST_VERIFY_PASS`)
