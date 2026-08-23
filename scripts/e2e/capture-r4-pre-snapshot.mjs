import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { buildR4TrackingState } from './lib/r4-identity.mjs'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R4')) fail('missing_arguments')

const profileState = JSON.parse(await fs.readFile('.e2e-state/profiles.json', 'utf8'))
const dataState = JSON.parse(await fs.readFile('.e2e-state/test-data.json', 'utf8'))
const teacherId = profileState.profiles?.e2e_teacher?.id
const studentId = profileState.profiles?.e2e_student?.id
const itemId = dataState.records?.E2E_ITEM_BULK?.id
if (!teacherId || !studentId || !itemId) fail('reference_state_missing')

const admin = createAdminReadClient()
const references = await admin
  .from('profiles')
  .select('id,role,is_active')
  .in('id', [teacherId, studentId])
const itemReference = await admin
  .from('items')
  .select('id,status,item_type,stock_available')
  .eq('id', itemId)
  .maybeSingle()
if (references.error || itemReference.error) fail('reference_read_failed')
const teacher = (references.data ?? []).find((row) => row.id === teacherId)
const student = (references.data ?? []).find((row) => row.id === studentId)
const item = itemReference.data
if (!teacher || teacher.role !== 'teacher' || teacher.is_active !== true) fail('teacher_reference_invalid')
if (!student || student.role !== 'student' || student.is_active !== true) fail('student_reference_invalid')
if (!item || item.status !== 'active' || item.item_type !== 'consumable' || Number(item.stock_available) < 1) fail('item_reference_invalid')

const requestsResult = await admin
  .from('requests')
  .select('id,user_id,status,purpose,comments,approved_by,approved_at,rejection_reason,requested_at')
  .eq('user_id', teacherId)
if (requestsResult.error) fail('teacher_requests_read_failed')

const requests = requestsResult.data ?? []
const requestIds = requests.map((request) => request.id)
const requestItems = requestIds.length
  ? await admin.from('request_items').select('id,request_id,item_id,quantity_requested,quantity_approved,quantity_delivered,quantity_returned,quantity_damaged').in('request_id', requestIds)
  : { data: [], error: null }
const groups = requestIds.length
  ? await admin.from('request_groups').select('id,request_id,group_name,leader_student_id').in('request_id', requestIds)
  : { data: [], error: null }
const groupIds = (groups.data ?? []).map((group) => group.id)
const groupItems = groupIds.length
  ? await admin.from('request_group_items').select('id,request_group_id,item_id,quantity').in('request_group_id', groupIds)
  : { data: [], error: null }
if (requestItems.error || groups.error || groupItems.error) fail('teacher_request_children_read_failed')

const forbiddenTables = ['items', 'item_units', 'inventory_movements', 'loans', 'loan_items', 'returns', 'return_items', 'maintenance_records', 'audit_logs']
const forbiddenSnapshots = {}
for (const table of forbiddenTables) {
  const result = await admin.from(table).select('id')
  if (result.error) fail('forbidden_table_read_failed')
  forbiddenSnapshots[table] = (result.data ?? []).map((row) => row.id)
}
const referenceItemBefore = await admin
  .from('items')
  .select('id,status,item_type,stock_total,stock_available')
  .eq('id', itemId)
  .maybeSingle()
if (referenceItemBefore.error || !referenceItemBefore.data) fail('reference_item_snapshot_failed')

const runId = 'R4-B1-' + Date.now().toString(36)
const purpose = 'E2E_MUT_REQ_R4_' + runId
const tracking = buildR4TrackingState({
  runId,
  purpose,
  teacherAlias: 'e2e_teacher',
  studentAlias: 'e2e_student',
  itemAlias: 'E2E_ITEM_BULK',
  preRequestIds: requestIds,
})
const snapshot = {
  ...tracking,
  capturedAt: new Date().toISOString(),
  requestItems: requestItems.data ?? [],
  groups: groups.data ?? [],
  groupItems: groupItems.data ?? [],
  forbiddenSnapshots,
  referenceItemBefore: referenceItemBefore.data,
}
const target = '.e2e-state/runtime/r4-pre-snapshot.json'
await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
await fs.writeFile(target, JSON.stringify(snapshot, null, 2) + '\n', { mode: 0o600 })
await fs.chmod(target, 0o600)
console.log('R4_REMOTE_PRE_SNAPSHOT_CAPTURE: PASS')
console.log('R4_TEACHER_REFERENCE_VALID: PASS')
console.log('R4_STUDENT_REFERENCE_VALID: PASS')
console.log('R4_ITEM_REFERENCE_VALID: PASS')
console.log('R4_REFERENCE_RESOLUTION_DETERMINISTIC: yes')
console.log('R4_REMOTE_PRE_SNAPSHOT_REQUEST_COUNT: ' + requestIds.length)
console.log('R4_PRE_ID_WRITE_TRACKING_READY: yes')
console.log('R4_UNTRACKED_WRITE_WINDOW: 0')
console.log('REMOTE_WRITES: 0')

function fail(code) {
  console.error('R4_REMOTE_PRE_SNAPSHOT_CAPTURE: FAIL\nCATEGORY: ' + code)
  process.exit(1)
}
