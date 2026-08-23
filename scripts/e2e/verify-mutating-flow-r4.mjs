import { createAdminReadClient } from './lib/mutating-remote.mjs'
import fs from 'node:fs/promises'
import { isR4PreSetRestored } from './lib/r4-identity.mjs'

const args = new Set(process.argv.slice(2))
const stage = process.argv.find((arg) => arg.startsWith('--stage='))?.slice(8)
const namespace = 'E2E_MUT_REQ_R4_'

if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R4')) fail('missing_arguments')
if (!['pre', 'post-cleanup'].includes(stage)) fail('unsupported_stage_without_authorized_fixture')

const admin = createAdminReadClient()
const snapshotPath = '.e2e-state/runtime/r4-pre-snapshot.json'
let snapshot
try {
  snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
} catch {
  fail('r4_pre_snapshot_missing')
}
const expectedAttemptCount = stage === 'pre' ? 0 : 1
if (snapshot.flow !== 'FLOW-R4' || snapshot.creationAttemptCount !== expectedAttemptCount || !Array.isArray(snapshot.preRequestIds)) {
  fail('r4_pre_snapshot_contract_invalid')
}

if (stage === 'post-cleanup') {
  if (!snapshot.capturedIds) fail('captured_ids_missing')
  const teacherId = JSON.parse(await fs.readFile('.e2e-state/profiles.json', 'utf8')).profiles.e2e_teacher.id
  const requests = await admin.from('requests').select('id').eq('user_id', teacherId)
  if (requests.error || !isR4PreSetRestored(snapshot.preRequestIds, (requests.data ?? []).map((row) => row.id))) fail('pre_set_not_restored')
  const ids = snapshot.capturedIds
  const checks = [
    ['requests', [ids.requestId]],
    ['request_items', ids.requestItemIds],
    ['request_groups', ids.requestGroupIds],
    ['request_group_items', ids.requestGroupItemIds],
  ]
  for (const [table, tableIds] of checks) {
    const result = await admin.from(table).select('id').in('id', tableIds)
    if (result.error || (result.data ?? []).length !== 0) fail('captured_residual_' + table)
  }
  console.log('FLOW_R4_POST_CLEANUP: PASS')
  console.log('R4_POST_CLEANUP_REQUEST_SET_EQUALS_PRE: yes')
  console.log('R4_CAPTURED_REQUEST_RESIDUAL_COUNT: 0')
  console.log('R4_CAPTURED_REQUEST_ITEM_RESIDUAL_COUNT: 0')
  console.log('R4_CAPTURED_GROUP_RESIDUAL_COUNT: 0')
  console.log('R4_CAPTURED_GROUP_ITEM_RESIDUAL_COUNT: 0')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}
const requestResult = await admin
  .from('requests')
  .select('id,user_id,purpose,comments,status')
  .or(`purpose.like.${namespace}%,comments.like.${namespace}%`)

if (requestResult.error) fail('namespace_requests_read_failed')

const requests = requestResult.data ?? []
const requestIds = requests.map((request) => request.id)
if (requests.length) fail('r4_namespace_request_residual')

const groupsQuery = requestIds.length
  ? await admin.from('request_groups').select('id,request_id,group_name').in('request_id', requestIds)
  : { data: [], error: null }

if (groupsQuery.error) fail('namespace_groups_read_failed')
if ((groupsQuery.data ?? []).length) fail('r4_namespace_group_residual')

console.log('FLOW_R4_PRE_STATE: PASS')
console.log('R4_NAMESPACE: ' + namespace)
console.log('R4_NAMESPACE_REQUESTS: 0')
console.log('R4_NAMESPACE_GROUPS: 0')
console.log('R4_IDENTITY_MODEL: PRE_SNAPSHOT_SET_DIFFERENCE_RELATIONAL_SIGNATURE')
console.log('REMOTE_WRITES: 0')

function fail(code) {
  console.error('FLOW_R4_PRE_STATE: FAIL\nCATEGORY: ' + code)
  process.exit(1)
}
