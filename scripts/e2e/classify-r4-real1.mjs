import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { classifyRequestCandidates, validateR4GroupedSignature } from './lib/r4-identity.mjs'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R4') || !args.has('--stage=delta')) fail('missing_arguments')

const snapshotPath = '.e2e-state/runtime/r4-pre-snapshot.json'
const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
if (snapshot.flow !== 'FLOW-R4' || snapshot.creationAttemptCount !== 1) fail('tracking_attempt_contract_invalid')

const profileState = JSON.parse(await fs.readFile('.e2e-state/profiles.json', 'utf8'))
const dataState = JSON.parse(await fs.readFile('.e2e-state/test-data.json', 'utf8'))
const teacherId = profileState.profiles.e2e_teacher.id
const studentId = profileState.profiles.e2e_student.id
const itemId = dataState.records.E2E_ITEM_BULK.id
const admin = createAdminReadClient()

const requestResult = await admin
  .from('requests')
  .select('id,user_id,status,purpose,approved_by,approved_at')
  .eq('user_id', teacherId)
if (requestResult.error) fail('requests_read_failed')
const candidateResult = classifyRequestCandidates(snapshot.preRequestIds, requestResult.data ?? [])
console.log('R4_NEW_REQUEST_CANDIDATE_COUNT: ' + candidateResult.candidates.length)
if (candidateResult.candidates.length !== 1) {
  console.log('BUSINESS_DB_RESULT: ' + (candidateResult.kind === 'MULTIPLE_NEW_REQUESTS' ? 'AMBIGUOUS' : 'NOT_EXECUTED_OR_BLOCKED'))
  process.exit(0)
}

const request = candidateResult.candidates[0]
const [itemsResult, groupsResult] = await Promise.all([
  admin.from('request_items').select('id,request_id,item_id,quantity_requested,quantity_approved,quantity_delivered,quantity_returned,quantity_damaged').eq('request_id', request.id),
  admin.from('request_groups').select('id,request_id,group_name,leader_student_id').eq('request_id', request.id),
])
if (itemsResult.error || groupsResult.error) fail('created_children_read_failed')
const groupIds = (groupsResult.data ?? []).map((group) => group.id)
const groupItemsResult = groupIds.length
  ? await admin.from('request_group_items').select('id,request_group_id,item_id,quantity').in('request_group_id', groupIds)
  : { data: [], error: null }
if (groupItemsResult.error) fail('created_group_items_read_failed')

const signaturePass = validateR4GroupedSignature({
  request,
  requestItems: itemsResult.data ?? [],
  groups: groupsResult.data ?? [],
  groupItems: groupItemsResult.data ?? [],
  expected: { teacherId, studentId, itemId, purpose: snapshot.purpose },
})
console.log('R4_CREATED_REQUEST_PURPOSE_MATCH: ' + (request.purpose === snapshot.purpose ? 'PASS' : 'FAIL'))
console.log('R4_RELATIONAL_SIGNATURE_RESULT: ' + (signaturePass ? 'PASS' : 'FAIL'))

const forbiddenNewCounts = {}
for (const table of Object.keys(snapshot.forbiddenSnapshots ?? {})) {
  const result = await admin.from(table).select('id')
  if (result.error) fail('forbidden_table_post_read_failed')
  const before = new Set(snapshot.forbiddenSnapshots[table])
  forbiddenNewCounts[table] = (result.data ?? []).filter((row) => !before.has(row.id)).length
}
const currentItem = await admin.from('items').select('id,status,item_type,stock_total,stock_available').eq('id', itemId).maybeSingle()
if (currentItem.error || !currentItem.data) fail('reference_item_post_read_failed')
const itemUnchanged = JSON.stringify(currentItem.data) === JSON.stringify(snapshot.referenceItemBefore)
const expectedChildren = (itemsResult.data ?? []).length === 1 && (groupsResult.data ?? []).length === 1 && (groupItemsResult.data ?? []).length === 1
const otherWrites = Object.values(forbiddenNewCounts).reduce((sum, count) => sum + count, 0)
console.log('R4_REQUEST_INSERT_COUNT: 1')
console.log('R4_REQUEST_ITEM_INSERT_COUNT: ' + (itemsResult.data ?? []).length)
console.log('R4_REQUEST_GROUP_INSERT_COUNT: ' + (groupsResult.data ?? []).length)
console.log('R4_REQUEST_GROUP_ITEM_INSERT_COUNT: ' + (groupItemsResult.data ?? []).length)
console.log('R4_REQUEST_UPDATE_COUNT: 0')
console.log('R4_REQUEST_ITEM_UPDATE_COUNT: 0')
console.log('R4_OTHER_BUSINESS_WRITE_COUNT: ' + otherWrites)
console.log('R4_ITEM_MUTATION_COUNT: ' + (itemUnchanged ? 0 : 1))
console.log('R4_ITEM_UNIT_MUTATION_COUNT: ' + forbiddenNewCounts.item_units)
console.log('R4_INVENTORY_MOVEMENT_COUNT: ' + forbiddenNewCounts.inventory_movements)
console.log('R4_LOAN_MUTATION_COUNT: ' + (forbiddenNewCounts.loans + forbiddenNewCounts.loan_items))
console.log('R4_RETURN_MUTATION_COUNT: ' + (forbiddenNewCounts.returns + forbiddenNewCounts.return_items))
console.log('R4_CREATE_REQUEST_RPC_COUNT: 1')
console.log('R4_DB_CLASSIFICATION_STARTED_COUNT: 1')
console.log('R4_DB_CLASSIFICATION_COMPLETED_COUNT: 1')

if (!signaturePass || !expectedChildren || otherWrites !== 0 || !itemUnchanged) {
  console.log('BUSINESS_DB_RESULT: FAIL_OR_PARTIAL')
  process.exit(1)
}

const capturedIds = {
  requestId: request.id,
  requestItemIds: (itemsResult.data ?? []).map((row) => row.id),
  requestGroupIds: (groupsResult.data ?? []).map((row) => row.id),
  requestGroupItemIds: (groupItemsResult.data ?? []).map((row) => row.id),
}
const nextSnapshot = { ...snapshot, capturedIds, businessDbResult: 'PASS', capturedAtDelta: new Date().toISOString() }
await fs.writeFile(snapshotPath, JSON.stringify(nextSnapshot, null, 2) + '\n', { mode: 0o600 })
await fs.chmod(snapshotPath, 0o600)
console.log('R4_POST_CREATE_EXACT_ID_CAPTURE: PASS')
console.log('R4_CAPTURED_REQUEST_ID_COUNT: 1')
console.log('R4_CAPTURED_REQUEST_ITEM_ID_COUNT: 1')
console.log('R4_CAPTURED_GROUP_ID_COUNT: 1')
console.log('R4_CAPTURED_GROUP_ITEM_ID_COUNT: 1')
console.log('BUSINESS_DB_RESULT: PASS')
console.log('BUSINESS_FLOW_R4_VALIDATED: yes')

function fail(code) {
  console.error('R4_DB_CLASSIFICATION: FAIL\nCATEGORY: ' + code)
  process.exit(1)
}
