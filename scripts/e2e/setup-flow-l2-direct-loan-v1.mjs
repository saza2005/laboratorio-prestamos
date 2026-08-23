import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const trackerPath = '.e2e-state/runtime/l2-direct-loan-snapshot.json'
const historyPath = '.e2e-state/runtime/l2-direct-loan-attempt-history.json'
const args = new Set(process.argv.slice(2))
const fail = (code) => { console.error(`L2_SETUP: FAIL_CLOSED (${code})`); process.exit(1) }
const proof = (value, code) => { if (!value) fail(code) }

proof(process.cwd() === root, 'wrong_project_workdir')
proof(args.has('--confirm-e2e') && args.has('--flow=FLOW-L2') && args.has('--execute'), 'authorization_required')
try { process.loadEnvFile('.env.e2e') } catch { fail('env_e2e_load_failed') }
const expectedRef = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
const publicUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
proof(expectedRef && publicUrl === `https://${expectedRef}.supabase.co`, 'e2e_project_identity')

const initial = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
proof(initial.status === 'PRISTINE' && initial.setupAttempt === 0 && initial.cleanupAttempt === 0, 'tracker_not_pristine')
const history = JSON.parse(await fs.readFile(historyPath, 'utf8'))
proof(Array.isArray(history.records), 'history_invalid')
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

const attemptId = `L2-${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}`
const ownership = `E2E_MUT_LOAN_${attemptId}`
const created = await client.rpc('create_inventory_item_transaction', {
  p_code: ownership, p_name: `E2E direct loan ${attemptId}`, p_description: 'Dedicated FLOW-L2 bulk fixture',
  p_category: 'E2E', p_item_type: 'consumable', p_track_individual: false, p_stock_total: 1,
  p_stock_available: 1, p_status: 'active', p_location: 'E2E',
})
proof(!created.error && created.data, 'fixture_item_create_failed')
const item = await client.from('items').select('id,code,status,track_individual,stock_available').eq('id', created.data).maybeSingle()
proof(!item.error && item.data?.code === ownership && item.data.status === 'active' && item.data.track_individual === false && item.data.stock_available === 1, 'fixture_item_verification_failed')

const active = {
  version: 1, flow: 'FLOW-L2', status: 'ACTIVE_FIXTURE', setupAttempt: 1, businessSubmissionCount: 0, cleanupAttempt: 0,
  attemptId, ownership, actorRole: 'lab_staff', borrowerRole: 'student', borrowerId: borrower.data.id,
  fixture: { itemId: item.data.id, itemCode: item.data.code, itemStockBefore: item.data.stock_available, itemCreatedByAttempt: true },
  baseline: { stockAvailable: item.data.stock_available, loanOwned: 0, movementOwned: 0 }, remoteWriteProven: false,
  capturedAt: new Date().toISOString(), protocolAuditPath: '.e2e-state/runtime/l2-direct-loan-protocol-audit.jsonl',
}
await fs.writeFile(trackerPath, JSON.stringify(active, null, 2) + '\n', { mode: 0o600 })
console.log('L2_SETUP: PASS FIXTURE_READY')
