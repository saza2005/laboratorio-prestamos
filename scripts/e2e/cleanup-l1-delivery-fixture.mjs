import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--execute') || process.env.E2E_MUTATING_CONFIRM !== 'FLOW-L1-CLEANUP') fail('cleanup_authorization_required')
const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
if (snapshot.cleanupAttempt !== 0 || snapshot.requestCreateAttempt !== 1 || !snapshot.requestId || !snapshot.ownershipToken) fail('cleanup_tracking_invalid')
if (snapshot.createFailureClass === 'known_collision' || snapshot.createFailureClass === 'known_duplicate_request') fail('cleanup_not_owned')
await writeSnapshot({ ...snapshot, cleanupAttempt: 1 })
const admin = createAdminReadClient()
const [requestResult, itemResult, loanResult, movementResult, itemStateResult, groupResult, loanGroupResult] = await Promise.all([
  admin.from('requests').select('id,user_id,status,purpose,e2e_fixture_token').eq('id', snapshot.requestId).maybeSingle(),
  admin.from('request_items').select('id,request_id,item_id,quantity_requested,quantity_approved,quantity_delivered').eq('request_id', snapshot.requestId),
  admin.from('loans').select('id,request_id,user_id,status,delivered_by').eq('request_id', snapshot.requestId),
  admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id').eq('reference_table', 'loans'),
  admin.from('items').select('id,status,item_type,track_individual,stock_total,stock_available').eq('id', snapshot.referenceIds.itemId).maybeSingle(),
  admin.from('request_groups').select('id').eq('request_id', snapshot.requestId),
  admin.from('loan_groups').select('id,loan_id').limit(1000),
])
if ([requestResult, itemResult, loanResult, movementResult, itemStateResult, groupResult, loanGroupResult].some((result) => result.error)) fail('cleanup_pre_read_failed')
const request = requestResult.data
const items = itemResult.data ?? []
const loans = loanResult.data ?? []
const movements = (movementResult.data ?? []).filter((row) => loans.some((loan) => loan.id === row.reference_id))
const groups = groupResult.data ?? []
const loanGroups = (loanGroupResult.data ?? []).filter((row) => loans.some((loan) => loan.id === row.loan_id))
const itemState = itemStateResult.data
const pending = snapshot.fixtureReady !== true
const preDelivery = request && request.e2e_fixture_token === snapshot.ownershipToken && request.user_id === snapshot.referenceIds.studentId && request.purpose === snapshot.purpose && request.status === (pending ? 'approved' : 'approved') && items.length === 1 && items[0].id === snapshot.requestItemId && items[0].request_id === snapshot.requestId && items[0].item_id === snapshot.referenceIds.itemId && items[0].quantity_requested === 1 && items[0].quantity_approved === 1 && items[0].quantity_delivered === 0 && loans.length === 0 && movements.length === 0 && groups.length === 0 && loanGroups.length === 0 && itemState && itemState.id === snapshot.referenceIds.itemId && itemState.stock_available === snapshot.itemBefore.stock_available
const deliveredLoan = loans.length === 1 ? loans[0] : null
const deliveredMovement = movements.length === 1 ? movements[0] : null
const delivered = request && request.e2e_fixture_token === snapshot.ownershipToken && request.user_id === snapshot.referenceIds.studentId && request.purpose === snapshot.purpose && request.status === 'delivered' && items.length === 1 && items[0].id === snapshot.requestItemId && items[0].request_id === snapshot.requestId && items[0].item_id === snapshot.referenceIds.itemId && items[0].quantity_requested === 1 && items[0].quantity_approved === 1 && items[0].quantity_delivered === 1 && deliveredLoan && deliveredLoan.request_id === snapshot.requestId && deliveredLoan.status === 'active' && deliveredLoan.user_id === snapshot.referenceIds.studentId && deliveredMovement && deliveredMovement.item_id === snapshot.referenceIds.itemId && deliveredMovement.movement_type === 'loan_out' && deliveredMovement.quantity === 1 && deliveredMovement.reference_table === 'loans' && deliveredMovement.reference_id === deliveredLoan.id && groups.length === 0 && loanGroups.length === 0 && itemState && itemState.id === snapshot.referenceIds.itemId && itemState.stock_available === snapshot.itemBefore.stock_available - 1
if (preDelivery) {
  await deletePreDelivery(admin, snapshot)
  console.log('L1_DELIVERY_CLEANUP_CLASS: PREDELIVERY_INTACT')
} else if (delivered) {
  const loanItems = await admin.from('loan_items').select('id,loan_id,item_id,item_unit_id,quantity,returned_quantity,damaged_quantity,missing_quantity').eq('loan_id', deliveredLoan.id)
  if (loanItems.error || (loanItems.data ?? []).length !== 1) fail('unexpected_loan_item_graph')
  const loanItem = loanItems.data[0]
  if (loanItem.item_id !== snapshot.referenceIds.itemId || loanItem.item_unit_id !== null || loanItem.quantity !== 1 || loanItem.returned_quantity !== 0 || loanItem.damaged_quantity !== 0 || loanItem.missing_quantity !== 0) fail('unexpected_loan_item_state')
  await restoreStock(admin, snapshot)
  await deleteExactly(admin, 'inventory_movements', { id: deliveredMovement.id, item_id: snapshot.referenceIds.itemId, reference_id: deliveredLoan.id })
  await deleteExactly(admin, 'loan_items', { id: loanItem.id, loan_id: deliveredLoan.id })
  await deleteExactly(admin, 'loans', { id: deliveredLoan.id, request_id: snapshot.requestId })
  await deleteExactly(admin, 'request_items', { id: snapshot.requestItemId, request_id: snapshot.requestId })
  await deleteExactly(admin, 'requests', { id: snapshot.requestId, e2e_fixture_token: snapshot.ownershipToken })
  console.log('L1_DELIVERY_CLEANUP_CLASS: FULLY_DELIVERED_MINIMAL_BULK')
  console.log('L1_DELIVERY_CLEANUP_SEQUENCE: RESTORE_ITEM_STOCK,DELETE_INVENTORY_MOVEMENT,DELETE_LOAN_ITEM,DELETE_LOAN,DELETE_REQUEST_ITEM,DELETE_REQUEST')
} else {
  console.error('L1_DELIVERY_CLEANUP: FAIL\nCATEGORY: unexpected_or_ambiguous_structure')
  process.exit(1)
}

async function deletePreDelivery(admin, state) {
  await deleteExactly(admin, 'request_items', { id: state.requestItemId, request_id: state.requestId })
  await deleteExactly(admin, 'requests', { id: state.requestId, e2e_fixture_token: state.ownershipToken })
}
async function restoreStock(admin, state) {
  const current = await admin.from('items').select('id,stock_available').eq('id', state.referenceIds.itemId).maybeSingle()
  if (current.error || !current.data || current.data.stock_available !== state.itemBefore.stock_available - 1) fail('stock_restore_precondition_failed')
  const restored = await admin.from('items').update({ stock_available: state.itemBefore.stock_available }).eq('id', state.referenceIds.itemId).eq('stock_available', state.itemBefore.stock_available - 1).select('id')
  if (restored.error || (restored.data ?? []).length !== 1) fail('stock_restore_failed')
}
async function deleteExactly(admin, table, predicates) {
  let query = admin.from(table).delete().select('id')
  for (const [key, value] of Object.entries(predicates)) query = query.eq(key, value)
  const result = await query
  if (result.error || (result.data ?? []).length !== 1) fail('cleanup_delete_failed_' + table)
}
async function writeSnapshot(value) {
  const temp = `${snapshotPath}.${process.pid}.${crypto.randomUUID()}.tmp`
  const handle = await fs.open(temp, 'w', 0o600)
  await handle.writeFile(JSON.stringify(value, (_key, item) => item === undefined ? undefined : item, 2) + '\n')
  await handle.sync(); await handle.close(); await fs.rename(temp, snapshotPath)
}
function fail(code) { console.error('L1_DELIVERY_CLEANUP: FAIL\nCATEGORY: ' + code); process.exit(1) }
