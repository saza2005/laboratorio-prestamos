import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const args = new Set(process.argv.slice(2))
const stage = [...args].find((arg) => arg.startsWith('--stage='))?.slice(8)
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--execute') || !['create', 'approve'].includes(stage)) fail('explicit_fixture_authorization_required')

const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
if (stage === 'create' && (snapshot.requestCreateAttempt !== 0 || snapshot.approvalAttempt !== 0)) fail('fixture_attempt_already_used')
if (stage === 'approve' && (snapshot.requestCreateAttempt !== 1 || snapshot.approvalAttempt !== 0 || !snapshot.requestId || !snapshot.requestItemId || !snapshot.ownershipToken)) fail('approval_tracking_invalid')

const env = process.env
const url = env.NEXT_PUBLIC_SUPABASE_URL
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (stage === 'create') {
  if (!url || !env.SUPABASE_SERVICE_ROLE_KEY) fail('fixture_admin_configuration_missing')
  const admin = createAdminReadClient()
  const requestId = crypto.randomUUID()
  const requestItemId = crypto.randomUUID()
  const ownershipToken = crypto.randomUUID()

  await writeSnapshot({ ...snapshot, requestId, requestItemId, ownershipToken, requestCreateAttempt: 0, remoteWriteConfirmed: false, createFailureClass: undefined })

  const [requestCollision, itemCollision, tokenCollision] = await Promise.all([
    admin.from('requests').select('id').eq('id', requestId).maybeSingle(),
    admin.from('request_items').select('id').eq('id', requestItemId).maybeSingle(),
    admin.from('requests').select('id').eq('e2e_fixture_token', ownershipToken).maybeSingle(),
  ])
  if (requestCollision.error || itemCollision.error || tokenCollision.error) fail('fixture_collision_read_failed')
  if (requestCollision.data || itemCollision.data || tokenCollision.data) {
    await writeSnapshot({ ...snapshot, requestId, requestItemId, ownershipToken, requestCreateAttempt: 0, remoteWriteConfirmed: false, createFailureClass: 'known_collision' })
    fail('generated_fixture_id_collision')
  }

  await writeSnapshot({ ...snapshot, requestId, requestItemId, ownershipToken, requestCreateAttempt: 1, remoteWriteConfirmed: false, createFailureClass: undefined })

  const created = await admin.from('requests').insert({
    id: requestId,
    user_id: snapshot.referenceIds.studentId,
    purpose: snapshot.purpose,
    comments: 'L1 dedicated fixture',
    scheduled_return_date: null,
    status: 'pending',
    e2e_fixture_token: ownershipToken,
  }).select('id,e2e_fixture_token').single()

  if (created.error || !created.data) {
    const duplicate = created.error?.code === '23505'
    await writeSnapshot({ ...snapshot, requestId, requestItemId, ownershipToken, requestCreateAttempt: 1, remoteWriteConfirmed: false, createFailureClass: duplicate ? 'known_duplicate_request' : 'ambiguous_request_insert' })
    fail(duplicate ? 'fixture_request_insert_duplicate' : 'fixture_request_insert_ambiguous')
  }
  if (created.data.id !== requestId || created.data.e2e_fixture_token !== ownershipToken) fail('fixture_request_identity_mismatch')

  const createdItem = await admin.from('request_items').insert({
    id: requestItemId,
    request_id: requestId,
    item_id: snapshot.referenceIds.itemId,
    quantity_requested: 1,
    quantity_approved: 0,
    quantity_delivered: 0,
    quantity_returned: 0,
    quantity_damaged: 0,
  }).select('id').single()
  if (createdItem.error || createdItem.data?.id !== requestItemId) {
    await writeSnapshot({ ...snapshot, requestId, requestItemId, ownershipToken, requestCreateAttempt: 1, remoteWriteConfirmed: false, createFailureClass: 'ambiguous_request_item_insert' })
    fail('fixture_request_item_insert_failed')
  }

  const requestItems = await admin.from('request_items').select('id,item_id,quantity_requested,quantity_approved,quantity_delivered').eq('request_id', requestId)
  if (requestItems.error || (requestItems.data ?? []).length !== 1 || requestItems.data[0].id !== requestItemId || requestItems.data[0].item_id !== snapshot.referenceIds.itemId || requestItems.data[0].quantity_requested !== 1 || requestItems.data[0].quantity_approved !== 0 || requestItems.data[0].quantity_delivered !== 0) fail('fixture_request_item_read_failed')
  await writeSnapshot({ ...snapshot, requestCreateAttempt: 1, approvalAttempt: 0, requestId, requestItemId, ownershipToken, remoteWriteConfirmed: true, createFailureClass: undefined })
  console.log('L1_FIXTURE_REQUEST_CREATE_EXECUTIONS: 1')
  console.log('L1_FIXTURE_REQUEST_REMOTE_WRITE_CONFIRMED: yes')
} else {
  if (!url || !anon || !env.E2E_LAB_STAFF_EMAIL || !env.E2E_LAB_STAFF_PASSWORD) fail('lab_staff_fixture_configuration_missing')
  const staff = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const staffLogin = await staff.auth.signInWithPassword({ email: env.E2E_LAB_STAFF_EMAIL, password: env.E2E_LAB_STAFF_PASSWORD })
  if (staffLogin.error) fail('lab_staff_fixture_login_failed')
  await writeSnapshot({ ...snapshot, approvalAttempt: 1 })
  const approved = await staff.rpc('approve_request_transaction', {
    p_request_id: snapshot.requestId,
    p_items: [{ request_item_id: snapshot.requestItemId, quantity_approved: 1 }],
  })
  if (approved.error) fail('fixture_approval_failed')
  await writeSnapshot({ ...snapshot, approvalAttempt: 1, remoteWriteConfirmed: true, fixtureReady: true, createFailureClass: undefined })
  console.log('L1_FIXTURE_APPROVAL_EXECUTIONS: 1')
  console.log('L1_FIXTURE_APPROVE_RPC_EXECUTIONS: 1')
  console.log('L1_FIXTURE_PRE_BUSINESS_STATUS: approved')
  console.log('L1_BUSINESS_DELIVERY_EXECUTIONS: 0')
}

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
  console.error('L1_FIXTURE_PREPARATION: FAIL\nCATEGORY: ' + code)
  process.exit(1)
}
