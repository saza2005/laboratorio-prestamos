import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const trackerPath = '.e2e-state/runtime/l2-direct-loan-snapshot.json'
const historyPath = '.e2e-state/runtime/l2-direct-loan-attempt-history.json'
const args = new Set(process.argv.slice(2))
const fail = (code) => { console.error(`L2_CLEANUP: FAIL_CLOSED (${code})`); process.exit(1) }
const proof = (value, code) => { if (!value) fail(code) }
proof(args.has('--confirm-e2e') && args.has('--flow=FLOW-L2') && args.has('--execute'), 'authorization_required')
proof(process.env.E2E_MUTATING_CONFIRM === 'FLOW-L2-CLEANUP', 'cleanup_confirmation_required')
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }
const state = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
proof(state.flow === 'FLOW-L2' && state.status === 'CLEANUP_REQUIRED' && state.cleanupAttempt === 0, 'tracker_invalid')
proof(state.fixture?.itemId && state.fixture?.itemCreatedByAttempt && state.ownership, 'owned_fixture_missing')
const admin = createAdminReadClient()
const read = async (table, columns, query) => { const result = await query(admin.from(table).select(columns)); proof(!result.error, `read_failed_${table}`); return result.data ?? [] }
const loans = await read('loans', 'id,user_id,status,notes', q => q.eq('notes', state.ownership))
const loanItems = loans.length ? await read('loan_items', 'id,loan_id,item_id,quantity,item_unit_id', q => q.eq('loan_id', loans[0].id)) : []
const movements = loans.length ? await read('inventory_movements', 'id,item_id,movement_type,quantity,reference_table,reference_id,notes', q => q.eq('reference_id', loans[0].id).eq('reference_table', 'loans')) : []
const item = await read('items', 'id,code,track_individual,stock_available', q => q.eq('id', state.fixture.itemId))
proof(item.length === 1 && item[0].code === state.fixture.itemCode && item[0].track_individual === false, 'item_ownership_invalid')
if (loans.length === 0) {
  proof(movements.length === 0 && item[0].stock_available === state.baseline.stockAvailable, 'unexpected_preloan_state')
} else {
  proof(loans.length === 1 && loans[0].user_id === state.borrowerId && loans[0].status === 'active', 'loan_ownership_invalid')
  proof(loanItems.length === 1 && loanItems[0].loan_id === loans[0].id && loanItems[0].item_id === state.fixture.itemId && loanItems[0].quantity === 1 && loanItems[0].item_unit_id === null, 'loan_item_contract_invalid')
  proof(movements.length === 1 && movements[0].item_id === state.fixture.itemId && movements[0].movement_type === 'loan_out' && movements[0].quantity === 1 && movements[0].reference_id === loans[0].id, 'movement_contract_invalid')
  proof(item[0].stock_available === state.baseline.stockAvailable - 1, 'stock_delta_invalid')
}
await fs.writeFile(trackerPath, JSON.stringify({ ...state, status: 'CLEANUP_REQUIRED', cleanupAttempt: 1 }, null, 2) + '\n', { mode: 0o600 })
const deleteExactly = async (table, predicates) => { let query = admin.from(table).delete().select('id'); for (const [key, value] of Object.entries(predicates)) query = query.eq(key, value); const result = await query; proof(!result.error && (result.data ?? []).length === 1, `delete_failed_${table}`) }
if (loans.length) {
  const restored = await admin.from('items').update({ stock_available: state.baseline.stockAvailable }).eq('id', state.fixture.itemId).eq('stock_available', state.baseline.stockAvailable - 1).select('id')
  proof(!restored.error && (restored.data ?? []).length === 1, 'stock_restore_failed')
  await deleteExactly('inventory_movements', { id: movements[0].id, reference_id: loans[0].id })
  await deleteExactly('loan_items', { id: loanItems[0].id, loan_id: loans[0].id })
  await deleteExactly('loans', { id: loans[0].id, user_id: state.borrowerId, notes: state.ownership })
}
await deleteExactly('items', { id: state.fixture.itemId, code: state.fixture.itemCode })
const postLoans = await read('loans', 'id', q => q.eq('notes', state.ownership))
const postMovements = await read('inventory_movements', 'id', q => q.eq('notes', state.ownership))
const postItem = await read('items', 'id', q => q.eq('id', state.fixture.itemId))
proof(postLoans.length === 0 && postMovements.length === 0 && postItem.length === 0, 'post_verify_failed')
const history = JSON.parse(await fs.readFile(historyPath, 'utf8'))
history.records.push({ version: 1, state: 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE', flow: 'FLOW-L2', outcome: loans.length ? 'FULLY_LOANED_BULK_OWNED' : 'PRE_LOAN_FIXTURE_ONLY', businessSubmissionCount: state.businessSubmissionCount, cleanup: 'PASS', secretFields: 0 })
await fs.writeFile(historyPath, JSON.stringify(history, null, 2) + '\n', { mode: 0o600 })
await fs.writeFile(trackerPath, JSON.stringify({ ...state, status: 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE', cleanupAttempt: 1, fixture: undefined, remoteWriteProven: loans.length === 1 }, null, 2) + '\n', { mode: 0o600 })
console.log('L2_CLEANUP: PASS POST_VERIFY=PASS HISTORY_APPEND=PASS TRACKER=CONSUMED_CLEAN_NO_ACTIVE_FIXTURE')
