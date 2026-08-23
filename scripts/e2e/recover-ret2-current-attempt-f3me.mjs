import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const trackerPath = '.e2e-state/runtime/ret2-full-return-snapshot.json'
const historyPath = '.e2e-state/runtime/ret2-full-return-attempt-history.json'
const manifestPath = '.e2e-state/runtime/ret2-full-return-attempt-manifest.json'
const paths = {
  setup: 'scripts/e2e/setup-flow-ret2-full-return-v1.mjs',
  test: 'tests/e2e/mutating/full-return-ret2.actual.spec.ts',
  cleanup: 'scripts/e2e/cleanup-flow-ret2-full-return-v1.mjs',
  runner: 'scripts/e2e/run-flow-ret2-full-return-v1.mjs',
}
const args = process.argv.slice(2)
const fail = (code) => { console.error(`L1_F3ME_RECOVERY_FAILURE=${code}`); process.exit(1) }
const proof = (value, code) => { if (!value) fail(code) }
const sha256File = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')
const read = async (admin, table, columns, build) => { const result = await build(admin.from(table).select(columns)); proof(!result.error, `READ_${table}`); return result.data ?? [] }
const exact = (rows, predicate) => rows.filter(predicate).length === 1

proof(process.cwd() === root, 'WRONG_PROJECT')
proof(args.length === 0, 'AUTHORIZATION')
try { process.loadEnvFile('.env.e2e') } catch { fail('ENV_E2E') }
const expectedRef = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
const publicUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
proof(expectedRef && publicUrl === `https://${expectedRef}.supabase.co`, 'E2E_PROJECT')
const state = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
proof(state.flow === 'RET2' && state.status === 'CLEANUP_REQUIRED' && state.setupAttempt === 1 && state.cleanupAttempt === 0, 'TRACKER_ATTEMPT')
proof(state.fixture?.itemCreatedByAttempt === true && state.attemptId && state.ownership, 'ATTEMPT_IDENTITY')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
proof(manifest.flow === 'RET2' && manifest.runner_version === 'ret2-full-return-v1', 'MANIFEST_IDENTITY')
for (const [key, relative] of Object.entries(paths)) proof(manifest[`${key}_sha256`] === await sha256File(relative), `MANIFEST_${key.toUpperCase()}_LINK`) 
const borrower = createAdminReadClient()
const borrowerRows = await read(borrower, 'profiles', 'id,role,is_active', q => q.eq('id', state.borrowerId).eq('role', 'student').eq('is_active', true))
proof(borrowerRows.length === 1, 'BORROWER_OWNERSHIP')
const admin = borrower
const loans = await read(admin, 'loans', 'id,user_id,status,notes', q => q.eq('id', state.fixture.loanId).eq('user_id', state.borrowerId).eq('notes', state.ownership))
const loanItems = await read(admin, 'loan_items', 'id,loan_id,item_id,quantity,returned_quantity,damaged_quantity,missing_quantity,item_unit_id', q => q.eq('id', state.fixture.loanItemId).eq('loan_id', state.fixture.loanId).eq('item_id', state.fixture.itemId))
const returns = await read(admin, 'returns', 'id,loan_id,notes', q => q.eq('loan_id', state.fixture.loanId))
const returnItems = returns.length === 1 ? await read(admin, 'return_items', 'id,return_id,loan_item_id,quantity_ok,quantity_damaged,quantity_missing', q => q.eq('return_id', returns[0].id)) : []
const movements = await read(admin, 'inventory_movements', 'id,item_id,movement_type,quantity,reference_table,reference_id', q => q.eq('item_id', state.fixture.itemId))
const items = await read(admin, 'items', 'id,code,track_individual,stock_available', q => q.eq('id', state.fixture.itemId).eq('code', state.fixture.itemCode))
const allClean = loans.length === 0 && loanItems.length === 0 && returns.length === 0 && returnItems.length === 0 && movements.length === 0 && items.length === 0
let classification
let business = 'UNPROVEN'
if (allClean) {
  classification = 'ALREADY_CLEAN'
} else {
  proof(items.length === 1 && items[0].track_individual === false, 'AMBIGUOUS_ITEM_OWNERSHIP')
  const fullyReturned = loans.length === 1 && loanItems.length === 1 && returns.length === 1 && returnItems.length === 1 && loans[0].status === 'returned' && loanItems[0].quantity === 1 && loanItems[0].returned_quantity === 1 && loanItems[0].damaged_quantity === 0 && loanItems[0].missing_quantity === 0 && loanItems[0].item_unit_id === null && returnItems[0].loan_item_id === state.fixture.loanItemId && returnItems[0].quantity_ok === 1 && returnItems[0].quantity_damaged === 0 && returnItems[0].quantity_missing === 0 && items[0].stock_available === 1 && movements.length === 2 && exact(movements, (m) => m.reference_table === 'loans' && m.reference_id === state.fixture.loanId && m.movement_type === 'loan_out' && m.quantity === 1) && exact(movements, (m) => m.reference_table === 'returns' && m.reference_id === returns[0].id && m.movement_type === 'return_ok' && m.quantity === 1)
  const preReturn = loans.length === 1 && loanItems.length === 1 && returns.length === 0 && returnItems.length === 0 && loans[0].status === 'active' && loanItems[0].quantity === 1 && loanItems[0].returned_quantity === 0 && loanItems[0].damaged_quantity === 0 && loanItems[0].missing_quantity === 0 && loanItems[0].item_unit_id === null && items[0].stock_available === 0 && movements.length === 1 && exact(movements, (m) => m.reference_table === 'loans' && m.reference_id === state.fixture.loanId && m.movement_type === 'loan_out' && m.quantity === 1)
  if (fullyReturned) { classification = 'FULLY_RETURNED_OWNED'; business = 'PROVEN_OCCURRED' }
  else if (preReturn) { classification = 'PRE_RETURN_ACTIVE_LOAN_OWNED'; business = 'PROVEN_NOT_OCCURRED' }
  else { classification = 'AMBIGUOUS_OR_FOREIGN'; fail('AMBIGUOUS_OR_FOREIGN') }
}
await fs.writeFile(trackerPath, JSON.stringify({ ...state, status: 'CLEANUP_REQUIRED', cleanupAttempt: 1 }, null, 2) + '\n', { mode: 0o600 })
const deleteExactly = async (table, predicates) => { let query = admin.from(table).delete().select('id'); for (const [key, value] of Object.entries(predicates)) query = query.eq(key, value); const result = await query; proof(!result.error && (result.data ?? []).length === 1, `DELETE_${table}`) }
if (classification === 'FULLY_RETURNED_OWNED') {
  await deleteExactly('inventory_movements', { reference_table: 'returns', reference_id: returns[0].id })
  await deleteExactly('return_items', { id: returnItems[0].id, return_id: returns[0].id })
  await deleteExactly('returns', { id: returns[0].id, loan_id: state.fixture.loanId })
}
if (classification === 'FULLY_RETURNED_OWNED' || classification === 'PRE_RETURN_ACTIVE_LOAN_OWNED') {
  const restored = await admin.from('items').update({ stock_available: state.baseline.stockAvailableAfterLoan }).eq('id', state.fixture.itemId).eq('code', state.fixture.itemCode).eq('stock_available', items[0].stock_available).select('id')
  proof(!restored.error && (restored.data ?? []).length === 1, 'ITEM_RESTORE')
  await deleteExactly('inventory_movements', { reference_table: 'loans', reference_id: state.fixture.loanId })
  await deleteExactly('loan_items', { id: state.fixture.loanItemId, loan_id: state.fixture.loanId, item_id: state.fixture.itemId })
  await deleteExactly('loans', { id: state.fixture.loanId, user_id: state.borrowerId, notes: state.ownership })
  await deleteExactly('items', { id: state.fixture.itemId, code: state.fixture.itemCode })
}
const postLoans = await read(admin, 'loans', 'id', q => q.eq('notes', state.ownership))
const postLoanItems = await read(admin, 'loan_items', 'id', q => q.eq('id', state.fixture.loanItemId))
const postReturns = await read(admin, 'returns', 'id', q => q.eq('loan_id', state.fixture.loanId))
const postReturnItems = postReturns.length ? await read(admin, 'return_items', 'id', q => q.eq('return_id', postReturns[0].id)) : []
const postMovements = await read(admin, 'inventory_movements', 'id', q => q.eq('item_id', state.fixture.itemId))
const postItems = await read(admin, 'items', 'id', q => q.eq('id', state.fixture.itemId))
proof(postLoans.length === 0 && postLoanItems.length === 0 && postReturns.length === 0 && postReturnItems.length === 0 && postMovements.length === 0 && postItems.length === 0, 'POST_VERIFY')
const history = JSON.parse(await fs.readFile(historyPath, 'utf8'))
proof(Array.isArray(history.records) && history.records.length === 0, 'HISTORY_NOT_FIRST_RECOVERY')
history.records.push({ version: 1, state: 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE', flow: 'RET2', outcome: classification, business, cleanup: 'PASS', secretFields: 0 })
await fs.writeFile(historyPath, JSON.stringify(history, null, 2) + '\n', { mode: 0o600 })
await fs.writeFile(trackerPath, JSON.stringify({ ...state, status: 'CONSUMED_CLEAN_NO_ACTIVE_FIXTURE', cleanupAttempt: 1, fixture: undefined, remoteWriteProven: business === 'PROVEN_OCCURRED' }, null, 2) + '\n', { mode: 0o600 })
console.log(`L1_F3ME_RET2_RECOVERY: PASS CLASS=${classification} BUSINESS=${business} REMOTE_POST_VERIFY=PASS HISTORY_APPEND=PASS TRACKER_POSTSTATE=CONSUMED_CLEAN_NO_ACTIVE_FIXTURE`)
