import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'

const args = new Set(process.argv.slice(2))
const stage = [...args].find((arg) => arg.startsWith('--stage='))?.slice(8)
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !['pre', 'created', 'fixture-ready', 'post-cleanup'].includes(stage)) fail('invalid_stage')

const snapshotPath = '.e2e-state/runtime/l1-b-snapshot.json'
const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
const admin = createAdminReadClient()
const item = await admin.from('items').select('id,code,status,item_type,track_individual,stock_total,stock_available').eq('id', snapshot.referenceIds.itemId).maybeSingle()
const movements = await admin.from('inventory_movements').select('id,item_id,movement_type,quantity,reference_table,reference_id,created_by,notes').eq('item_id', snapshot.referenceIds.itemId)
const units = await admin.from('item_units').select('id,item_id,availability_status,condition').eq('item_id', snapshot.referenceIds.itemId)
const requests = await admin.from('requests').select('id,purpose,comments,status,user_id').eq('purpose', snapshot.purpose)
const loans = await admin.from('loans').select('id,notes,status,request_id,user_id,delivered_by').eq('request_id', snapshot.requestId ?? '00000000-0000-0000-0000-000000000000')
if (item.error || movements.error || units.error || requests.error || loans.error) fail('fixture_read_failed')

const requestRows = requests.data ?? []
const loanRows = loans.data ?? []
const same = (a, b) => JSON.stringify([...a].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)))) === JSON.stringify([...b].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))))
const stockSame = JSON.stringify(item.data) === JSON.stringify(snapshot.itemBefore)
const movementsSame = same(movements.data ?? [], snapshot.movementsBefore)
const unitsSame = same(units.data ?? [], snapshot.unitsBefore)

if (stage === 'pre') {
  if (requestRows.length !== 0 || loanRows.length !== 0 || !stockSame || !movementsSame || !unitsSame) fail('pre_fixture_residual')
  console.log('L1_VERIFIER_PRE: PASS')
  console.log('L1_CURRENT_RUN_REQUEST_COUNT: 0')
  console.log('L1_CURRENT_RUN_LOAN_COUNT: 0')
  console.log('L1_CURRENT_RUN_MOVEMENT_COUNT: 0')
} else if (stage === 'created') {
  await verifyRequest('pending', 0, 0)
  console.log('L1_FIXTURE_CREATED_VERIFIER: PASS')
} else if (stage === 'fixture-ready') {
  await verifyRequest('approved', 1, 0)
  if (loanRows.length !== 0 || !stockSame || !movementsSame || !unitsSame) fail('fixture_ready_delta')
  console.log('L1_FIXTURE_READY_VERIFIER: PASS')
  console.log('L1_FIXTURE_EXPECTED_PRE_BUSINESS_STATUS: approved')
  console.log('FIXTURE_READY_COUNT: 1')
} else {
  if (requestRows.length !== 0 || loanRows.length !== 0 || !stockSame || !movementsSame || !unitsSame) fail('post_cleanup_not_restored')
  console.log('L1_POST_CLEANUP_VERIFIER: PASS')
  console.log('L1_POSTFLIGHT_BULK_STOCK_EQUALS_PRE: yes')
  console.log('L1_POSTFLIGHT_MOVEMENT_SET_EQUALS_PRE: yes')
  console.log('L1_POSTFLIGHT_UNIT_STATE_EQUALS_PRE: yes')
}
console.log('REMOTE_WRITES: 0')

async function verifyRequest(status, approved, delivered) {
  if (requestRows.length !== 1) fail('request_cardinality')
  const request = requestRows[0]
  if (request.user_id !== snapshot.referenceIds.studentId || request.status !== status) fail('request_signature')
  if (!snapshot.requestId) {
    const items = await admin.from('request_items').select('id,item_id,quantity_requested,quantity_approved,quantity_delivered').eq('request_id', request.id)
    if (items.error || (items.data ?? []).length !== 1) fail('request_items_signature')
    if (items.data[0].item_id !== snapshot.referenceIds.itemId || items.data[0].quantity_requested !== 1 || items.data[0].quantity_approved !== approved || items.data[0].quantity_delivered !== delivered) fail('request_item_signature')
  } else {
    const items = await admin.from('request_items').select('id,item_id,quantity_requested,quantity_approved,quantity_delivered').eq('request_id', snapshot.requestId)
    if (items.error || (items.data ?? []).length !== 1) fail('request_items_signature')
    if (items.data[0].item_id !== snapshot.referenceIds.itemId || items.data[0].quantity_requested !== 1 || items.data[0].quantity_approved !== approved || items.data[0].quantity_delivered !== delivered) fail('request_item_signature')
  }
}

function fail(code) {
  console.error('L1_FIXTURE_VERIFIER: FAIL\nCATEGORY: ' + code)
  process.exit(1)
}
