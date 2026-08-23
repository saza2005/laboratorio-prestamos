import fs from 'node:fs'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { loadState } from './lib/mutating-state.mjs'

const args = new Set(process.argv.slice(2))
const stage = process.argv.find((arg) => arg.startsWith('--stage='))?.slice(8)
function fail(code) {
  const label = stage === 'seeded' ? 'SEEDED' : stage === 'delta' ? 'DELTA' : stage === 'post-cleanup' ? 'POST_CLEANUP' : 'PRE_STATE'
  console.error(`FLOW_R2_${label}: FAIL`)
  console.error('CATEGORY: ' + code)
  process.exit(1)
}
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R2')) fail('missing_arguments')
if (!['pre', 'seeded', 'delta', 'post-cleanup'].includes(stage)) fail('invalid_stage')

const state = loadState()
const flow = state.flows?.['FLOW-R2']
const admin = createAdminReadClient()
const baseline = { requests: 4, request_items: 4, request_groups: 1, request_group_items: 1, loans: 3, loan_items: 3, returns: 2, return_items: 2, maintenance_records: 1, inventory_movements: 6, audit_logs: 0 }
if (stage === 'pre') {
  if (state.active_flow !== null || Object.keys(state.flows).length) fail('state_not_clean')
  const { data, error } = await admin.from('requests').select('id,purpose').like('purpose', 'E2E_MUT_REQ_R2_%')
  if (error) fail('namespace_read_failed')
  if ((data ?? []).length) fail('residual_present')
  console.log('FLOW_R2_PRE_STATE: PASS')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}
if (!flow || state.active_flow !== 'FLOW-R2' || !flow.request_id || flow.entities?.length !== 1) fail('tracked_state_missing')
const dataState = JSON.parse(fs.readFileSync('.e2e-state/test-data.json', 'utf8'))
const profileState = JSON.parse(fs.readFileSync('.e2e-state/profiles.json', 'utf8'))
const bulkId = dataState.records?.E2E_ITEM_BULK?.id
const studentId = profileState.profiles?.e2e_student?.id
const adminId = profileState.profiles?.e2e_admin?.id
const requestId = flow.request_id
if (!bulkId || !studentId || !adminId || !flow.correlation_marker?.startsWith('E2E_MUT_REQ_R2_')) fail('local_contract_missing')
async function rows(table, columns, filter) {
  const result = await filter(admin.from(table).select(columns))
  if (result.error) fail('read_failed_' + table)
  return result.data ?? []
}
async function count(table) {
  const result = await admin.from(table).select('id', { count: 'exact', head: true })
  if (result.error) fail('count_failed_' + table)
  return result.count ?? 0
}
async function verifyFixture(status) {
  const requests = await rows('requests', 'id,user_id,status,purpose,rejection_reason,approved_by,approved_at', (q) => q.eq('id', requestId))
  if (requests.length !== 1) fail('request_not_unique')
  const request = requests[0]
  if (request.user_id !== studentId || request.purpose !== flow.correlation_marker || request.status !== status) fail('request_contract_mismatch')
  if (status === 'rejected' && (request.approved_by !== adminId || !request.approved_at || !request.rejection_reason)) fail('rejection_metadata_mismatch')
  const items = await rows('request_items', 'id,request_id,item_id,quantity_requested', (q) => q.eq('request_id', requestId))
  if (items.length !== 1 || items[0].item_id !== bulkId || items[0].quantity_requested !== 1) fail('request_item_contract_mismatch')
  const loans = await rows('loans', 'id', (q) => q.eq('request_id', requestId))
  if (loans.length) fail('loan_association_present')
}
async function verifyCounts(expected) {
  for (const [table, wanted] of Object.entries(expected)) if (await count(table) !== wanted) fail(`count_${table}`)
}
if (stage === 'seeded') {
  await verifyFixture('pending')
  await verifyCounts({ ...baseline, requests: 5, request_items: 5 })
  console.log('FLOW_R2_SEEDED: PASS')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}
if (stage === 'delta') {
  await verifyFixture('rejected')
  await verifyCounts({ ...baseline, requests: 5, request_items: 5 })
  const item = await rows('items', 'id,stock_total,stock_available', (q) => q.eq('id', bulkId))
  if (item.length !== 1 || item[0].stock_total !== 10 || item[0].stock_available !== 8) fail('inventory_delta')
  console.log('FLOW_R2_DELTA: PASS')
  console.log('REQUEST_DELTA: 1_SEED_0_REJECT')
  console.log('REQUEST_ITEMS_DELTA: 1_SEED_0_REJECT')
  console.log('STATUS_TRANSITION: pending_to_rejected')
  console.log('AUDIT_LOGS_DELTA: 0')
  console.log('INVENTORY_DELTA: 0')
  console.log('MOVEMENTS_DELTA: 0')
  console.log('LOANS_DELTA: 0')
  console.log('RETURNS_DELTA: 0')
  console.log('MAINTENANCE_DELTA: 0')
  process.exit(0)
}
const remaining = await rows('requests', 'id,purpose', (q) => q.eq('id', requestId))
const children = await rows('request_items', 'id', (q) => q.eq('request_id', requestId))
const residuals = await rows('requests', 'id,purpose', (q) => q.like('purpose', 'E2E_MUT_REQ_R2_%'))
if (remaining.length || children.length || residuals.length) fail('residual_fixture_present')
await verifyCounts(baseline)
console.log('FLOW_R2_POST_CLEANUP: PASS')
console.log('REMOTE_RESIDUALS: 0')
