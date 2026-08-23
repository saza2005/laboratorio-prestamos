import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const trackerPath = '.e2e-state/runtime/ret2-full-return-snapshot.json'
const historyPath = '.e2e-state/runtime/ret2-full-return-attempt-history.json'
const args = new Set(process.argv.slice(2))
const fail = (code) => { console.error(`RET2_CLEANUP_V2: FAIL_CLOSED (${code})`); process.exit(1) }
const proof = (value, code) => { if (!value) fail(code) }
proof(args.has('--confirm-e2e') && args.has('--flow=RET2') && args.has('--execute'), 'authorization_required')
proof(process.env.E2E_MUTATING_CONFIRM === 'RET2-CLEANUP-V2', 'cleanup_confirmation_required')
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }
const state = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
proof(state.flow === 'RET2' && state.status === 'CLEANUP_REQUIRED' && state.setupAttempt === 2 && state.cleanupAttempt === 0 && state.fixture?.itemCreatedByAttempt, 'tracker_invalid')
const admin = createAdminReadClient()
const read = async (table, columns, build) => { const result = await build(admin.from(table).select(columns)); proof(!result.error, `read_failed_${table}`); return result.data ?? [] }
const borrower = await read('profiles', 'id,role,is_active', q => q.eq('id', state.borrowerId).eq('role', 'student').eq('is_active', true))
proof(borrower.length === 1, 'borrower_persistent_integrity')
const loans = await read('loans', 'id,user_id,status,notes', q => q.eq('id', state.fixture.loanId).eq('notes', state.ownership))
const loanItems = await read('loan_items', 'id,loan_id,item_id,quantity,returned_quantity,damaged_quantity,missing_quantity,item_unit_id', q => q.eq('id', state.fixture.loanItemId).eq('loan_id', state.fixture.loanId))
const returns = await read('returns', 'id,loan_id,notes', q => q.eq('loan_id', state.fixture.loanId))
const returnItems = returns.length ? await read('return_items', 'id,return_id,loan_item_id,quantity_ok,quantity_damaged,quantity_missing', q => q.eq('return_id', returns[0].id)) : []
const movements = await read('inventory_movements', 'id,item_id,movement_type,quantity,reference_table,reference_id', q => q.eq('item_id', state.fixture.itemId))
const item = await read('items', 'id,code,stock_available,track_individual', q => q.eq('id', state.fixture.itemId).eq('code', state.fixture.itemCode))
const allClean = loans.length === 0 && loanItems.length === 0 && returns.length === 0 && returnItems.length === 0 && movements.length === 0 && item.length === 0
let classification
if (allClean) classification = 'ALREADY_CLEAN'
else {
  if (item.length !== 1) fail('AMBIGUOUS_OR_FOREIGN')
  proof(item[0].track_individual === false, 'item_ownership_invalid')
  const fullyReturned = loans.length === 1 && loanItems.length === 1 && returns.length === 1 && returnItems.length === 1 && loans[0].status === 'returned' && loanItems[0].quantity === 1 && loanItems[0].returned_quantity === 1 && loanItems[0].damaged_quantity === 0 && loanItems[0].missing_quantity === 0 && loanItems[0].item_unit_id === null && returnItems[0].loan_item_id === state.fixture.loanItemId && returnItems[0].quantity_ok === 1 && returnItems[0].quantity_damaged === 0 && returnItems[0].quantity_missing === 0 && item[0].stock_available === 1 && movements.length === 2 && movements.some((m) => m.reference_table === 'loans' && m.reference_id === state.fixture.loanId && m.movement_type === 'loan_out' && m.quantity === 1) && movements.some((m) => m.reference_table === 'returns' && m.reference_id === returns[0].id && m.movement_type === 'return_ok' && m.quantity === 1)
  const preReturn = loans.length === 1 && loanItems.length === 1 && returns.length === 0 && returnItems.length === 0 && loans[0].status === 'active' && loanItems[0].quantity === 1 && loanItems[0].returned_quantity === 0 && loanItems[0].damaged_quantity === 0 && loanItems[0].missing_quantity === 0 && loanItems[0].item_unit_id === null && item[0].stock_available === 0 && movements.length === 1 && movements[0].reference_table === 'loans' && movements[0].reference_id === state.fixture.loanId && movements[0].movement_type === 'loan_out' && movements[0].quantity === 1
  if (fullyReturned) classification = 'FULLY_RETURNED_OWNED'
  else if (preReturn) classification = 'PRE_RETURN_ACTIVE_LOAN_OWNED'
  else fail('MATERIALLY_INCONSISTENT')
}
await fs.writeFile(trackerPath, JSON.stringify({ ...state, status: 'CLEANUP_REQUIRED', cleanupAttempt: 1 }, null, 2) + '\n', { mode: 0o600 })
const deleteExactly = async (table, predicates) => { let query = admin.from(table).delete().select('id'); for (const [key, value] of Object.entries(predicates)) query = query.eq(key, value); const result = await query; proof(!result.error && (result.data ?? []).length === 1, `delete_failed_${table}`) }
if (classification === 'FULLY_RETURNED_OWNED') {
  await deleteExactly('inventory_movements', { reference_table: 'returns', reference_id: returns[0].id })
  await deleteExactly('return_items', { id: returnItems[0].id, return_id: returns[0].id })
  await deleteExactly('returns', { id: returns[0].id, loan_id: state.fixture.loanId })
}
if (classification === 'FULLY_RETURNED_OWNED' || classification === 'PRE_RETURN_ACTIVE_LOAN_OWNED') {
  const restored = await admin.from('items').update({ stock_available: state.baseline.stockAvailableAfterLoan }).eq('id', state.fixture.itemId).eq('stock_available', item[0].stock_available).select('id')
  proof(!restored.error && (restored.data ?? []).length === 1, 'stock_restore_failed')
  await deleteExactly('inventory_movements', { reference_table: 'loans', reference_id: state.fixture.loanId })
  await deleteExactly('loan_items', { id: state.fixture.loanItemId, loan_id: state.fixture.loanId })
  await deleteExactly('loans', { id: state.fixture.loanId, user_id: state.borrowerId, notes: state.ownership })
}
if (classification === 'FULLY_RETURNED_OWNED' || classification === 'PRE_RETURN_ACTIVE_LOAN_OWNED') {
  await deleteExactly('items', { id: state.fixture.itemId, code: state.fixture.itemCode })
}
const postLoans = await read('loans', 'id', q => q.eq('notes', state.ownership))
const postLoanItems = await read('loan_items', 'id', q => q.eq('id', state.fixture.loanItemId))
const postReturns = await read('returns', 'id', q => q.eq('loan_id', state.fixture.loanId))
const postReturnItems = postReturns.length ? await read('return_items', 'id', q => q.eq('return_id', postReturns[0].id)) : []
const postMovements = await read('inventory_movements', 'id', q => q.eq('item_id', state.fixture.itemId))
const postItem = await read('items', 'id', q => q.eq('id', state.fixture.itemId))
proof(postLoans.length === 0 && postLoanItems.length === 0 && postReturns.length === 0 && postReturnItems.length === 0 && postMovements.length === 0 && postItem.length === 0, 'post_verify_failed')
const history = JSON.parse(await fs.readFile(historyPath, 'utf8'))
history.records.push({ version: 2, state: 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE', flow: 'RET2', attemptOrdinal: 2, outcome: classification, cleanup: 'PASS', secretFields: 0 })
await fs.writeFile(historyPath, JSON.stringify(history, null, 2) + '\n', { mode: 0o600 })
await fs.writeFile(trackerPath, JSON.stringify({ ...state, status: 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE', cleanupAttempt: 1, fixture: undefined, remoteWriteProven: state.remoteWriteProven === true }, null, 2) + '\n', { mode: 0o600 })
console.log(`RET2_CLEANUP_V2: PASS CLASS=${classification} POST_VERIFY=PASS HISTORY_APPEND=PASS TRACKER=CONSUMED_CLEAN_NO_ACTIVE_FIXTURE`)
