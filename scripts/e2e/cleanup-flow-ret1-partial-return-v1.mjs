import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const runtimeStem = process.env.E2E_RUNTIME_RET1_STEM || 'ret1-partial-return'
const trackerPath = `.e2e-state/runtime/${runtimeStem}-snapshot.json`
const historyPath = `.e2e-state/runtime/${runtimeStem}-attempt-history.json`
const args = new Set(process.argv.slice(2))
const fail = (code) => { console.error(`RET1_CLEANUP: FAIL_CLOSED (${code})`); process.exit(1) }
const proof = (value, code) => { if (!value) fail(code) }
proof(args.has('--confirm-e2e') && args.has('--flow=RET1') && args.has('--execute'), 'authorization_required')
proof(/^[a-z0-9-]+$/.test(runtimeStem), 'runtime_stem_invalid')
proof(process.env.E2E_MUTATING_CONFIRM === 'RET1-CLEANUP', 'cleanup_confirmation_required')
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }

const state = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
proof(state.flow === 'RET1' && state.status === 'CLEANUP_REQUIRED' && state.cleanupAttempt === 0 && state.fixture?.itemCreatedByAttempt, 'tracker_invalid')
const admin = createAdminReadClient()
const read = async (table, columns, query) => { const result = await query(admin.from(table).select(columns)); proof(!result.error, `read_failed_${table}`); return result.data ?? [] }
const loans = await read('loans', 'id,user_id,status,notes', q => q.eq('id', state.fixture.loanId).eq('notes', state.ownership))
const loanItems = await read('loan_items', 'id,loan_id,item_id,quantity,returned_quantity,damaged_quantity,missing_quantity,item_unit_id', q => q.eq('id', state.fixture.loanItemId).eq('loan_id', state.fixture.loanId))
const returns = await read('returns', 'id,loan_id,notes', q => q.eq('notes', state.ownership).eq('loan_id', state.fixture.loanId))
const returnItems = returns.length ? await read('return_items', 'id,return_id,loan_item_id,quantity_ok,quantity_damaged,quantity_missing', q => q.eq('return_id', returns[0].id)) : []
const movements = await read('inventory_movements', 'id,item_id,movement_type,quantity,reference_table,reference_id', q => q.eq('item_id', state.fixture.itemId))
const item = await read('items', 'id,code,stock_available,stock_total,track_individual', q => q.eq('id', state.fixture.itemId).eq('code', state.fixture.itemCode))
proof(item.length === 1 && item[0].track_individual === false, 'item_ownership_invalid')

let classification = 'PRE_RETURN_ACTIVE_LOAN_FIXTURE'
if (returns.length || returnItems.length) {
  classification = 'PARTIALLY_RETURNED_OWNED'
  proof(returns.length === 1 && returnItems.length === 1, 'return_graph_ambiguous')
  proof(loanItems.length === 1 && loanItems[0].quantity === 2 && loanItems[0].returned_quantity === 1 && loanItems[0].damaged_quantity === 0 && loanItems[0].missing_quantity === 0, 'partial_loan_item_invalid')
  proof(loans.length === 1 && loans[0].status === 'partial_return', 'partial_loan_status_invalid')
  proof(returnItems[0].loan_item_id === state.fixture.loanItemId && returnItems[0].quantity_ok === 1 && returnItems[0].quantity_damaged === 0 && returnItems[0].quantity_missing === 0, 'return_item_invalid')
  proof(item[0].stock_available === 1, 'partial_stock_invalid')
  proof(movements.length === 2 && movements.some((m) => m.reference_table === 'loans' && m.reference_id === state.fixture.loanId && m.movement_type === 'loan_out' && m.quantity === 2) && movements.some((m) => m.reference_table === 'returns' && m.reference_id === returns[0].id && m.movement_type === 'return_ok' && m.quantity === 1), 'movement_graph_invalid')
} else {
  proof(loans.length === 1 && loanItems.length === 1 && loanItems[0].quantity === 2 && item[0].stock_available === 0, 'pre_return_graph_invalid')
  proof(movements.length === 1 && movements[0].reference_table === 'loans' && movements[0].reference_id === state.fixture.loanId && movements[0].movement_type === 'loan_out' && movements[0].quantity === 2, 'pre_return_movement_invalid')
}

await fs.writeFile(trackerPath, JSON.stringify({ ...state, status: 'CLEANUP_REQUIRED', cleanupAttempt: 1 }, null, 2) + '\n', { mode: 0o600 })
const deleteExactly = async (table, predicates) => { let query = admin.from(table).delete().select('id'); for (const [key, value] of Object.entries(predicates)) query = query.eq(key, value); const result = await query; proof(!result.error && (result.data ?? []).length === 1, `delete_failed_${table}`) }
if (returns.length) {
  await deleteExactly('inventory_movements', { reference_table: 'returns', reference_id: returns[0].id })
  await deleteExactly('return_items', { id: returnItems[0].id, return_id: returns[0].id })
  await deleteExactly('returns', { id: returns[0].id, loan_id: state.fixture.loanId, notes: state.ownership })
}
if (loans.length) {
  const restored = await admin.from('items').update({ stock_available: state.baseline.stockAvailableAfterLoan }).eq('id', state.fixture.itemId).eq('stock_available', item[0].stock_available).select('id')
  proof(!restored.error && (restored.data ?? []).length === 1, 'stock_restore_failed')
  await deleteExactly('inventory_movements', { reference_table: 'loans', reference_id: state.fixture.loanId })
  await deleteExactly('loan_items', { id: state.fixture.loanItemId, loan_id: state.fixture.loanId })
  await deleteExactly('loans', { id: state.fixture.loanId, user_id: state.borrowerId, notes: state.ownership })
}
await deleteExactly('items', { id: state.fixture.itemId, code: state.fixture.itemCode })
const postLoans = await read('loans', 'id', q => q.eq('notes', state.ownership))
const postLoanItems = await read('loan_items', 'id', q => q.eq('id', state.fixture.loanItemId))
const postReturns = await read('returns', 'id', q => q.eq('notes', state.ownership))
const postReturnItems = postReturns.length ? await read('return_items', 'id', q => q.eq('return_id', postReturns[0].id)) : []
const postMovements = await read('inventory_movements', 'id', q => q.eq('item_id', state.fixture.itemId))
const postItem = await read('items', 'id', q => q.eq('id', state.fixture.itemId))
proof(postLoans.length === 0 && postLoanItems.length === 0 && postReturns.length === 0 && postReturnItems.length === 0 && postMovements.length === 0 && postItem.length === 0, 'post_verify_failed')
const history = JSON.parse(await fs.readFile(historyPath, 'utf8'))
history.records.push({ version: 1, state: 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE', flow: 'RET1', outcome: classification, cleanup: 'PASS', secretFields: 0 })
await fs.writeFile(historyPath, JSON.stringify(history, null, 2) + '\n', { mode: 0o600 })
await fs.writeFile(trackerPath, JSON.stringify({ ...state, status: 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE', cleanupAttempt: 1, fixture: undefined, remoteWriteProven: state.remoteWriteProven === true }, null, 2) + '\n', { mode: 0o600 })
console.log(`RET1_CLEANUP: PASS CLASS=${classification} POST_VERIFY=PASS HISTORY_APPEND=PASS TRACKER=CONSUMED_CLEAN_NO_ACTIVE_FIXTURE`)
