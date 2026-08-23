import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--execute') || process.env.E2E_MUTATING_CONFIRM !== 'FLOW-L1-CLEANUP') fail('cleanup_authorization_required')

const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
const pendingFixture = snapshot.requestCreateAttempt === 1 && snapshot.approvalAttempt === 0 && snapshot.fixtureReady !== true
const approvedFixture = snapshot.fixtureReady === true && snapshot.approvalAttempt === 1
if ((!pendingFixture && !approvedFixture) || snapshot.cleanupAttempt !== 0 || snapshot.requestCreateAttempt !== 1 || !snapshot.requestId || !snapshot.ownershipToken) fail('cleanup_tracking_invalid')
if (snapshot.createFailureClass === 'known_collision' || snapshot.createFailureClass === 'known_duplicate_request') fail('cleanup_not_owned')

const cleanupState = { ...snapshot, cleanupAttempt: 1 }
await writeSnapshot(cleanupState)
const admin = createAdminReadClient()
const request = await admin.from('requests').select('id,user_id,status,purpose,e2e_fixture_token').eq('id', snapshot.requestId).maybeSingle()
const items = await admin.from('request_items').select('id,request_id,item_id,quantity_requested,quantity_approved,quantity_delivered').eq('request_id', snapshot.requestId)
const loans = await admin.from('loans').select('id').eq('request_id', snapshot.requestId)
if (request.error || items.error || loans.error) fail('cleanup_pre_read_failed')

if (!request.data && (items.data ?? []).length === 0 && (loans.data ?? []).length === 0) {
  console.log('L1_FIXTURE_NOTHING_TO_DELETE: yes')
  process.exit(0)
}
if (!request.data || request.data.e2e_fixture_token !== snapshot.ownershipToken) fail('cleanup_request_not_owned')
if (request.data.user_id !== snapshot.referenceIds.studentId || request.data.status !== (pendingFixture ? 'pending' : 'approved') || request.data.purpose !== snapshot.purpose) fail('cleanup_request_signature_invalid')
if ((loans.data ?? []).length !== 0) fail('delivery_detected_cleanup_not_fixture_only')
if ((items.data ?? []).length > 1) fail('cleanup_unexpected_item_cardinality')

if ((items.data ?? []).length === 1) {
  const item = items.data[0]
  if (item.id !== snapshot.requestItemId || item.request_id !== snapshot.requestId || item.item_id !== snapshot.referenceIds.itemId || item.quantity_requested !== 1 || item.quantity_approved !== (pendingFixture ? 0 : 1) || item.quantity_delivered !== 0) fail('cleanup_item_signature_invalid')
  const deletedItems = await admin.from('request_items').delete().eq('id', snapshot.requestItemId).eq('request_id', snapshot.requestId).select('id')
  if (deletedItems.error || (deletedItems.data ?? []).length !== 1) fail('cleanup_request_item_failed')
}

const deletedRequest = await admin.from('requests').delete().eq('id', snapshot.requestId).eq('e2e_fixture_token', snapshot.ownershipToken).select('id')
if (deletedRequest.error || (deletedRequest.data ?? []).length !== 1) fail('cleanup_request_failed')
const post = await admin.from('requests').select('id').eq('id', snapshot.requestId).maybeSingle()
if (post.error || post.data) fail('cleanup_post_verify_failed')
console.log('L1_B_CLEANUP_EXECUTIONS: 1')
console.log('L1_FIXTURE_ONLY_CLEANUP_PATH_USED: yes')
console.log('L1_POST_DELIVERY_RESTORATION_PATH_USED: no')
console.log('REMOTE_WRITES: authorized_fixture_cleanup_only')

async function writeSnapshot(value) {
  const tempPath = `${snapshotPath}.${process.pid}.${crypto.randomUUID()}.tmp`
  let renamed = false
  try {
    const handle = await fs.open(tempPath, 'w', 0o600)
    await handle.writeFile(JSON.stringify(value, (_key, item) => item === undefined ? undefined : item, 2) + '\n')
    await handle.sync()
    await handle.close()
    await fs.rename(tempPath, snapshotPath)
    renamed = true
    const directory = await fs.open(path.dirname(snapshotPath), 'r')
    await directory.sync()
    await directory.close()
    await fs.chmod(snapshotPath, 0o600)
  } catch (error) {
    if (!renamed) await fs.rm(tempPath, { force: true }).catch(() => {})
    throw error
  }
}

function fail(code) {
  console.error('L1_FIXTURE_CLEANUP: FAIL\nCATEGORY: ' + code)
  process.exit(1)
}
