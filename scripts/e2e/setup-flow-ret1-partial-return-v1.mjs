import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const runtimeStem = process.env.E2E_RUNTIME_RET1_STEM || 'ret1-partial-return'
const trackerPath = `.e2e-state/runtime/${runtimeStem}-snapshot.json`
const historyPath = `.e2e-state/runtime/${runtimeStem}-attempt-history.json`
const args = new Set(process.argv.slice(2))
const fail = (code) => { console.error(`RET1_SETUP: FAIL_CLOSED (${code})`); process.exit(1) }
const proof = (value, code) => { if (!value) fail(code) }

proof(process.cwd() === root, 'wrong_project_workdir')
proof(/^[a-z0-9-]+$/.test(runtimeStem), 'runtime_stem_invalid')
proof(args.has('--confirm-e2e') && args.has('--flow=RET1') && args.has('--execute'), 'authorization_required')
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }

const expectedRef = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
const publicUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
proof(expectedRef && publicUrl === `https://${expectedRef}.supabase.co`, 'e2e_project_identity')

const tracker = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
proof(tracker.flow === 'RET1' && tracker.status === 'PRISTINE' && tracker.setupAttempt === 0 && tracker.cleanupAttempt === 0, 'tracker_not_pristine')
const history = JSON.parse(await fs.readFile(historyPath, 'utf8'))
proof(Array.isArray(history.records) && history.records.length === 0, 'history_not_first_attempt')

const email = String(process.env.E2E_LAB_STAFF_EMAIL ?? '').trim()
const password = String(process.env.E2E_LAB_STAFF_PASSWORD ?? '')
const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
proof(email && password && anonKey, 'lab_staff_auth_configuration_missing')
const client = createClient(publicUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const signedIn = await client.auth.signInWithPassword({ email, password })
proof(!signedIn.error && signedIn.data.user, 'lab_staff_auth_failed')
const staff = await client.from('profiles').select('id,role,is_active').eq('id', signedIn.data.user.id).maybeSingle()
proof(!staff.error && staff.data?.role === 'lab_staff' && staff.data.is_active === true, 'lab_staff_profile_invalid')

const borrowerEmail = String(process.env.E2E_STUDENT_EMAIL ?? '').trim()
const borrower = await client.from('profiles').select('id,role,is_active').eq('email', borrowerEmail).eq('role', 'student').eq('is_active', true).maybeSingle()
proof(borrowerEmail && !borrower.error && borrower.data?.id, 'dedicated_student_borrower_missing')

const attemptId = `RET1-${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`
const ownership = `E2E_MUT_RETURN_${attemptId}`
const admin = createAdminReadClient()
const preItem = await admin.from('items').select('id').eq('code', ownership)
const preLoan = await admin.from('loans').select('id').eq('notes', ownership)
const preReturn = await admin.from('returns').select('id').eq('notes', ownership)
proof(!preItem.error && !preLoan.error && !preReturn.error && preItem.data.length === 0 && preLoan.data.length === 0 && preReturn.data.length === 0, 'ownership_namespace_not_empty')

const created = await client.rpc('create_inventory_item_transaction', {
  p_code: ownership,
  p_name: `E2E partial return ${attemptId}`,
  p_description: 'Dedicated FLOW-RET1 bulk fixture',
  p_category: 'E2E',
  p_item_type: 'consumable',
  p_track_individual: false,
  p_stock_total: 2,
  p_stock_available: 2,
  p_status: 'active',
  p_location: 'E2E',
})
proof(!created.error && created.data, 'fixture_item_create_failed')
const itemId = created.data
const item = await admin.from('items').select('id,code,status,track_individual,stock_total,stock_available').eq('id', itemId).maybeSingle()
proof(!item.error && item.data?.code === ownership && item.data.status === 'active' && item.data.track_individual === false && item.data.stock_total === 2 && item.data.stock_available === 2, 'fixture_item_verification_failed')

const loan = await client.rpc('create_multi_item_loan_transaction', {
  p_user_id: borrower.data.id,
  p_items: [{ item_id: itemId, item_unit_id: null, quantity: 2 }],
  p_expected_return_date: null,
  p_notes: ownership,
  p_delivered_by: signedIn.data.user.id,
})
proof(!loan.error && loan.data, 'fixture_loan_create_failed')
const loanId = loan.data
const loanRows = await admin.from('loans').select('id,user_id,status,notes').eq('id', loanId).eq('notes', ownership)
const loanItems = await admin.from('loan_items').select('id,loan_id,item_id,item_unit_id,quantity,returned_quantity,damaged_quantity,missing_quantity').eq('loan_id', loanId)
const movements = await admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id').eq('reference_id', loanId).eq('reference_table', 'loans')
const postItem = await admin.from('items').select('id,stock_available,track_individual').eq('id', itemId).maybeSingle()
proof(!loanRows.error && loanRows.data.length === 1 && loanRows.data[0].user_id === borrower.data.id && loanRows.data[0].status === 'active', 'fixture_loan_verification_failed')
proof(!loanItems.error && loanItems.data.length === 1 && loanItems.data[0].item_id === itemId && loanItems.data[0].quantity === 2 && loanItems.data[0].returned_quantity === 0 && loanItems.data[0].item_unit_id === null, 'fixture_loan_item_verification_failed')
proof(!movements.error && movements.data.length === 1 && movements.data[0].movement_type === 'loan_out' && movements.data[0].quantity === 2, 'fixture_movement_verification_failed')
proof(!postItem.error && postItem.data?.stock_available === 0 && postItem.data.track_individual === false, 'fixture_stock_verification_failed')
const returns = await admin.from('returns').select('id').eq('notes', ownership)
proof(!returns.error && returns.data.length === 0, 'unexpected_return_fixture')

const active = {
  version: 1,
  flow: 'RET1',
  status: 'ACTIVE_FIXTURE',
  setupAttempt: 1,
  businessSubmissionCount: 0,
  cleanupAttempt: 0,
  attemptId,
  ownership,
  actorRole: 'lab_staff',
  borrowerRole: 'student',
  borrowerId: borrower.data.id,
  fixture: { itemId, loanId, loanItemId: loanItems.data[0].id, itemCode: ownership, itemCreatedByAttempt: true },
  baseline: { itemExisted: false, stockAvailableBeforeLoan: 2, stockAvailableAfterLoan: 0, loanOwned: 0, loanItemOwned: 0, returnOwned: 0, movementOwned: 0 },
  prestate: { loanQuantity: 2, returnedQuantity: 0, damagedQuantity: 0, missingQuantity: 0, loanStatus: 'active' },
  remoteWriteProven: false,
  capturedAt: new Date().toISOString(),
  protocolAuditPath: `.e2e-state/runtime/${runtimeStem}-protocol-audit.jsonl`,
}
await fs.writeFile(trackerPath, JSON.stringify(active, null, 2) + '\n', { mode: 0o600 })
console.log('RET1_SETUP: PASS FIXTURE_READY')
