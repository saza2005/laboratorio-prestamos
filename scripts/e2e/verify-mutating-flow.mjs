import fs from 'node:fs'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { loadState } from './lib/mutating-state.mjs'

const args = new Set(process.argv.slice(2))
const stage = process.argv.find((arg) => arg.startsWith('--stage='))?.slice(8)
function fail(code) {
  const label = stage === 'delta' ? 'DELTA' : stage === 'post-cleanup' ? 'POST_CLEANUP' : 'PRE_STATE'
  console.error(`FLOW_R1_${label}: FAIL`)
  console.error(`CATEGORY: ${code}`)
  process.exit(1)
}

if (!args.has('--confirm-e2e') || (!args.has('--flow=FLOW-R1') && !args.has('--flow=FLOW-R2') && !args.has('--flow=FLOW-R3'))) fail('missing_arguments')
if (!['pre', 'seeded', 'delta', 'post-cleanup'].includes(stage)) fail('invalid_stage')

if (args.has('--flow=FLOW-R2')) {
  await import('./verify-mutating-flow-r2.mjs')
  process.exit(0)
}
if (args.has('--flow=FLOW-R3')) {
  await import('./verify-mutating-flow-r3.mjs')
  process.exit(0)
}
const state = loadState()
const flow = state.flows?.['FLOW-R1']
if (!flow && stage !== 'pre') fail('flow_state_missing')

if (stage === 'pre') {
  if (state.active_flow !== null || Object.values(state.flows).some((item) => item.entities?.length || item.cleanup_required)) fail('state_not_clean')
  const admin = createAdminReadClient()
  const { data, error } = await admin.from('requests').select('id,purpose').like('purpose', 'E2E_MUT_REQ_R1_%')
  if (error) fail('namespace_read_failed')
  if ((data ?? []).length) fail('mutating_residuals_present')
  console.log('FLOW_R1_PRE_STATE: PASS')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}

const marker = flow.correlation_marker
const requestId = flow.request_id ?? flow.entities?.find((entity) => entity.type === 'request')?.id
const expectedQuantity = Number(flow.expected_quantity)
const dataState = JSON.parse(fs.readFileSync('.e2e-state/test-data.json', 'utf8'))
const profileState = JSON.parse(fs.readFileSync('.e2e-state/profiles.json', 'utf8'))
const bulkId = dataState.records?.E2E_ITEM_BULK?.id
const studentId = profileState.profiles?.e2e_student?.id
if (!requestId || !marker?.startsWith('E2E_MUT_REQ_R1_') || !bulkId || !studentId) fail('tracking_metadata_missing')

const admin = createAdminReadClient()
async function rows(table, columns, filter) {
  let query = admin.from(table).select(columns)
  query = filter(query)
  const { data, error } = await query
  if (error) fail(`read_failed_${table}`)
  return data ?? []
}
async function count(table) {
  const result = await admin.from(table).select('id', { count: 'exact', head: true })
  if (result.error) fail(`count_failed_${table}`)
  return result.count ?? 0
}
async function verifyTrackedEntity() {
  const requests = await rows('requests', 'id,user_id,status,purpose', (query) => query.eq('id', requestId))
  if (requests.length !== 1) fail('tracked_request_not_unique')
  const request = requests[0]
  if (request.user_id !== studentId || request.status !== 'pending' || request.purpose !== marker) fail('tracked_request_contract_mismatch')
  const items = await rows('request_items', 'id,request_id,item_id,quantity_requested', (query) => query.eq('request_id', requestId))
  if (items.length !== 1 || items[0].item_id !== bulkId || items[0].quantity_requested !== expectedQuantity) fail('tracked_request_item_contract_mismatch')
  return items
}
const baseline = { requests: 4, request_items: 4, request_groups: 1, request_group_items: 1, loans: 3, loan_items: 3, returns: 2, return_items: 2, maintenance_records: 1, inventory_movements: 6 }
async function verifyCounts(expected) {
  for (const [table, wanted] of Object.entries(expected)) {
    if (await count(table) !== wanted) fail(`count_${table}`)
  }
}

if (stage === 'delta') {
  await verifyTrackedEntity()
  await verifyCounts({ ...baseline, requests: 5, request_items: 5 })
  const items = await rows('items', 'id,stock_total,stock_available', (query) => query.eq('id', bulkId))
  const units = await count('item_units')
  const movements = await count('inventory_movements')
  if (items.length !== 1 || items[0].stock_total !== 10 || items[0].stock_available !== 8 || units !== 2 || movements !== 6) fail('inventory_delta')
  console.log('FLOW_R1_DELTA: PASS')
  console.log('REQUEST_DELTA: 1')
  console.log('REQUEST_ITEMS_DELTA: 1')
  console.log('INVENTORY_DELTA: 0')
  console.log('ITEM_UNITS_DELTA: 0')
  console.log('INVENTORY_MOVEMENTS_DELTA: 0')
  console.log('LOANS_DELTA: 0')
  console.log('RETURNS_DELTA: 0')
  console.log('MAINTENANCE_DELTA: 0')
  process.exit(0)
}

const remainingRequests = await rows('requests', 'id,purpose', (query) => query.eq('id', requestId))
const remainingItems = await rows('request_items', 'id,request_id', (query) => query.eq('request_id', requestId))
const residuals = await rows('requests', 'id,purpose', (query) => query.like('purpose', 'E2E_MUT_REQ_R1_%'))
if (remainingRequests.length || remainingItems.length || residuals.length) fail('tracked_residual_present')
await verifyCounts(baseline)
console.log('FLOW_R1_POST_CLEANUP: PASS')
console.log('REMOTE_RESIDUALS: 0')
