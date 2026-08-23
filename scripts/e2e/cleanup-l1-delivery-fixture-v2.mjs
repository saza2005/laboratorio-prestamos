import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const args = new Set(process.argv.slice(2))
const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--execute') || process.env.E2E_MUTATING_CONFIRM !== 'FLOW-L1-CLEANUP') fail('cleanup_authorization_required')
const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
if (snapshot.cleanupAttempt !== 0 || snapshot.requestCreateAttempt !== 1 || !snapshot.requestId || !snapshot.ownershipToken) fail('cleanup_tracking_invalid')
await writeSnapshot({ ...snapshot, cleanupAttempt: 1 })
const admin = createAdminReadClient()
const graph = await readFixtureGraph(admin, snapshot)
const classification = classify(graph, snapshot)
console.log('L1_DELIVERY_CLEANUP_V2_CLASS: ' + classification)
if (classification === 'NO_FIXTURE_PRESENT') process.exit(0)
if (classification === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE') fail('unexpected_or_ambiguous_structure')
if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY') {
  await deleteExactly(admin, 'request_items', { id: snapshot.requestItemId, request_id: snapshot.requestId })
  await deleteExactly(admin, 'requests', { id: snapshot.requestId, e2e_fixture_token: snapshot.ownershipToken })
  console.log('L1_DELIVERY_CLEANUP_V2_SEQUENCE: DELETE_REQUEST_ITEM,DELETE_REQUEST')
  process.exit(0)
}
await restoreStock(admin, snapshot, graph.item)
await deleteExactly(admin, 'inventory_movements', { id: graph.movements[0].id, item_id: snapshot.referenceIds.itemId, reference_id: graph.loans[0].id })
await deleteExactly(admin, 'loan_items', { id: graph.loanItems[0].id, loan_id: graph.loans[0].id })
await deleteExactly(admin, 'loans', { id: graph.loans[0].id, request_id: snapshot.requestId })
await deleteExactly(admin, 'request_items', { id: snapshot.requestItemId, request_id: snapshot.requestId })
await deleteExactly(admin, 'requests', { id: snapshot.requestId, e2e_fixture_token: snapshot.ownershipToken })
console.log('L1_DELIVERY_CLEANUP_V2_SEQUENCE: RESTORE_ITEM_STOCK,DELETE_INVENTORY_MOVEMENT,DELETE_LOAN_ITEM,DELETE_LOAN,DELETE_REQUEST_ITEM,DELETE_REQUEST')

async function readFixtureGraph(admin, state) {
  const requestResult = await admin.from('requests').select('id,user_id,status,purpose,e2e_fixture_token').eq('id', state.requestId).maybeSingle()
  const itemsResult = await admin.from('request_items').select('id,request_id,item_id,quantity_requested,quantity_approved,quantity_delivered').eq('request_id', state.requestId)
  const loansResult = await admin.from('loans').select('id,request_id,user_id,status,delivered_by').eq('request_id', state.requestId)
  const groupsResult = await admin.from('request_groups').select('id').eq('request_id', state.requestId)
  if ([requestResult, itemsResult, loansResult, groupsResult].some((r) => r.error)) fail('cleanup_pre_read_failed')
  const request = requestResult.data
  const items = itemsResult.data ?? []
  const loans = loansResult.data ?? []
  const groupIds = (groupsResult.data ?? []).map((row) => row.id)
  const requestGroupItemsResult = groupIds.length ? await admin.from('request_group_items').select('id,request_group_id').in('request_group_id', groupIds) : { data: [], error: null }
  const itemResult = await admin.from('items').select('id,track_individual,stock_available').eq('id', state.referenceIds.itemId).maybeSingle()
  const unitsResult = await admin.from('item_units').select('id,item_id').eq('item_id', state.referenceIds.itemId)
  if ([requestGroupItemsResult, itemResult, unitsResult].some((r) => r.error)) fail('cleanup_pre_read_failed')
  let loanItems = [], movements = [], loanGroups = [], loanGroupItems = [], returns = []
  if (loans.length) {
    const loanIds = loans.map((loan) => loan.id)
    const [loanItemsResult, movementsResult, loanGroupsResult, returnsResult] = await Promise.all([
      admin.from('loan_items').select('id,loan_id,item_id,item_unit_id,quantity,returned_quantity,damaged_quantity,missing_quantity').in('loan_id', loanIds),
      admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id').eq('reference_table', 'loans').in('reference_id', loanIds),
      admin.from('loan_groups').select('id,loan_id').in('loan_id', loanIds),
      admin.from('returns').select('id,loan_id').in('loan_id', loanIds),
    ])
    if ([loanItemsResult, movementsResult, loanGroupsResult, returnsResult].some((r) => r.error)) fail('cleanup_pre_read_failed')
    loanItems = loanItemsResult.data ?? []; movements = movementsResult.data ?? []; loanGroups = loanGroupsResult.data ?? []; returns = returnsResult.data ?? []
    const loanGroupIds = loanGroups.map((row) => row.id)
    const loanGroupItemsResult = loanGroupIds.length ? await admin.from('loan_group_items').select('id,loan_group_id').in('loan_group_id', loanGroupIds) : { data: [], error: null }
    if (loanGroupItemsResult.error) fail('cleanup_pre_read_failed')
    loanGroupItems = loanGroupItemsResult.data ?? []
  }
  return { request, items, loans, item: itemResult.data, units: unitsResult.data ?? [], requestGroups: groupsResult.data ?? [], requestGroupItems: requestGroupItemsResult.data ?? [], loanItems, movements, loanGroups, loanGroupItems, returns }
}
function ownedRequest(state, graph) { return graph.request && graph.request.id === state.requestId && graph.request.e2e_fixture_token === state.ownershipToken && graph.request.user_id === state.referenceIds.studentId && graph.request.purpose === state.purpose }
function exactRequestItem(state, graph, approved, delivered) { return graph.items.length === 1 && graph.items[0].id === state.requestItemId && graph.items[0].request_id === state.requestId && graph.items[0].item_id === state.referenceIds.itemId && graph.items[0].quantity_requested === 1 && graph.items[0].quantity_approved === approved && graph.items[0].quantity_delivered === delivered }
function noForbiddenGraph(graph) { return graph.requestGroups.length === 0 && graph.requestGroupItems.length === 0 && graph.loanGroups.length === 0 && graph.loanGroupItems.length === 0 && graph.units.length === 0 && graph.returns.length === 0 }
function baseline(state, graph) { return graph.item && graph.item.id === state.referenceIds.itemId && graph.item.track_individual === false && graph.item.stock_available === state.itemBefore.stock_available }
function classify(graph, state) {
  if (!graph.request) return graph.items.length === 0 && graph.loans.length === 0 ? 'NO_FIXTURE_PRESENT' : 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE'
  if (!ownedRequest(state, graph) || !noForbiddenGraph(graph) || graph.items.length !== 1) return 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE'
  const pre = graph.loans.length === 0 && graph.loanItems.length === 0 && graph.movements.length === 0 && baseline(state, graph) && exactRequestItem(state, graph, 0, 0)
  if (graph.request.status === 'pending' && pre) return 'PENDING_PREDELIVERY'
  if (graph.request.status === 'approved' && pre && exactRequestItem(state, graph, 1, 0)) return 'APPROVED_PREDELIVERY'
  const loan = graph.loans.length === 1 ? graph.loans[0] : null
  const loanItem = graph.loanItems.length === 1 ? graph.loanItems[0] : null
  const movement = graph.movements.length === 1 ? graph.movements[0] : null
  const full = graph.request.status === 'delivered' && exactRequestItem(state, graph, 1, 1) && loan && loan.request_id === state.requestId && loan.user_id === state.referenceIds.studentId && loan.status === 'active' && loanItem && loanItem.loan_id === loan.id && loanItem.item_id === state.referenceIds.itemId && loanItem.item_unit_id === null && loanItem.quantity === 1 && loanItem.returned_quantity === 0 && loanItem.damaged_quantity === 0 && loanItem.missing_quantity === 0 && movement && movement.item_id === state.referenceIds.itemId && movement.movement_type === 'loan_out' && movement.quantity === 1 && movement.reference_table === 'loans' && movement.reference_id === loan.id && graph.item && graph.item.id === state.referenceIds.itemId && graph.item.stock_available === state.itemBefore.stock_available - 1
  return full ? 'FULLY_DELIVERED_MINIMAL_BULK' : 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE'
}
async function restoreStock(admin, state, item) { if (!item || item.stock_available !== state.itemBefore.stock_available - 1) fail('stock_restore_precondition_failed'); const result = await admin.from('items').update({ stock_available: state.itemBefore.stock_available }).eq('id', state.referenceIds.itemId).eq('stock_available', state.itemBefore.stock_available - 1).select('id'); if (result.error || (result.data ?? []).length !== 1) fail('stock_restore_failed') }
async function deleteExactly(admin, table, predicates) { let query = admin.from(table).delete().select('id'); for (const [key, value] of Object.entries(predicates)) query = query.eq(key, value); const result = await query; if (result.error || (result.data ?? []).length !== 1) fail('cleanup_delete_failed_' + table) }
async function writeSnapshot(value) { const temp = `${snapshotPath}.${process.pid}.${crypto.randomUUID()}.tmp`; const handle = await fs.open(temp, 'w', 0o600); await handle.writeFile(JSON.stringify(value, (_key, item) => item === undefined ? undefined : item, 2) + '\n'); await handle.sync(); await handle.close(); await fs.rename(temp, snapshotPath) }
function fail(code) { console.error('L1_DELIVERY_CLEANUP_V2: FAIL_CLOSED\nCATEGORY: ' + code); process.exit(1) }
