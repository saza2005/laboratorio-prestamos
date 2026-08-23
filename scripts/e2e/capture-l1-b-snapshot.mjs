import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1')) fail('missing_arguments')

const profiles = JSON.parse(await fs.readFile('.e2e-state/profiles.json', 'utf8'))
const data = JSON.parse(await fs.readFile('.e2e-state/test-data.json', 'utf8'))
const teacherId = profiles.profiles?.e2e_teacher?.id
const studentId = profiles.profiles?.e2e_student?.id
const staffId = profiles.profiles?.e2e_lab_staff?.id
const itemId = data.records?.E2E_ITEM_BULK?.id
if (!teacherId || !studentId || !staffId || !itemId) fail('reference_state_missing')

const admin = createAdminReadClient()
const refs = await admin.from('profiles').select('id,role,is_active').in('id', [studentId, staffId])
const item = await admin.from('items').select('id,code,status,item_type,track_individual,stock_total,stock_available').eq('id', itemId).maybeSingle()
if (refs.error || item.error || !item.data) fail('reference_read_failed')
const student = (refs.data ?? []).find((row) => row.id === studentId)
const staff = (refs.data ?? []).find((row) => row.id === staffId)
if (!student || student.role !== 'student' || student.is_active !== true) fail('student_reference_invalid')
if (!staff || staff.role !== 'lab_staff' || staff.is_active !== true) fail('staff_reference_invalid')
if (item.data.status !== 'active' || item.data.item_type !== 'consumable' || item.data.track_individual || Number(item.data.stock_available) < 1) fail('bulk_item_reference_invalid')

const runId = 'L1-B-' + Date.now().toString(36)
const purpose = 'E2E_MUT_REQ_L1_' + runId
const loanMarker = 'E2E_MUT_LOAN_L1_' + runId
const [requests, loans, movements, units] = await Promise.all([
  admin.from('requests').select('id,purpose,comments,status,user_id').eq('purpose', purpose),
  admin.from('loans').select('id,notes,status,request_id').eq('notes', loanMarker),
  admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id,created_by,notes').eq('item_id', itemId),
  admin.from('item_units').select('id,item_id,availability_status,condition').eq('item_id', itemId),
])
if (requests.error || loans.error || movements.error || units.error) fail('snapshot_read_failed')
if ((requests.data ?? []).length !== 0 || (loans.data ?? []).length !== 0) fail('namespace_collision')

const snapshot = {
  version: 1,
  flow: 'FLOW-L1',
  runId,
  purpose,
  loanMarker,
  actorAliases: { student: 'e2e_student', labStaff: 'e2e_lab_staff' },
  referenceAliases: { item: 'E2E_ITEM_BULK' },
  referenceIds: { studentId, staffId, itemId },
  expected: {
    requestStatus: 'approved',
    quantityRequested: 1,
    quantityApproved: 1,
    quantityDelivered: 0,
    loanCount: 0,
    movementDelta: 0,
    stockDelta: 0,
  },
  requestCreateAttempt: 0,
  approvalAttempt: 0,
  deliveryAttempt: 0,
  cleanupAttempt: 0,
  remoteWriteConfirmed: false,
  capturedAt: new Date().toISOString(),
  itemBefore: item.data,
  movementsBefore: movements.data ?? [],
  unitsBefore: units.data ?? [],
  requestNamespaceBefore: requests.data ?? [],
  loanNamespaceBefore: loans.data ?? [],
}
const target = '.e2e-state/runtime/l1-b-snapshot.json'
await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
await fs.writeFile(target, JSON.stringify(snapshot, null, 2) + '\n', { mode: 0o600 })
await fs.chmod(target, 0o600)
console.log('L1_PRE_SNAPSHOT_CAPTURE: PASS')
console.log('L1_PRE_SNAPSHOT_DURABLE: yes')
console.log('L1_PRE_SNAPSHOT_STOCK_CAPTURED: yes')
console.log('L1_PRE_SNAPSHOT_MOVEMENT_SET_CAPTURED: yes')
console.log('L1_REQUEST_NAMESPACE_COLLISION_COUNT: 0')
console.log('L1_LOAN_NAMESPACE_COLLISION_COUNT: 0')
console.log('L1_PRE_WRITE_TRACKING_DURABLE: yes')
console.log('L1_UNTRACKED_WRITE_WINDOW: 0')
console.log('REMOTE_WRITES: 0')

function fail(code) {
  console.error('L1_PRE_SNAPSHOT_CAPTURE: FAIL\nCATEGORY: ' + code)
  process.exit(1)
}
