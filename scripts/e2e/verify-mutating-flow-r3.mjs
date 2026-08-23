import fs from 'node:fs'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { loadState } from './lib/mutating-state.mjs'

const args = new Set(process.argv.slice(2))
const stage = process.argv.find((arg) => arg.startsWith('--stage='))?.slice(8)
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R3')) fail('missing_arguments')
if (!['pre', 'seeded', 'delta', 'post-cleanup'].includes(stage)) fail('invalid_stage')
const baseline = { requests: 4, request_items: 4, request_groups: 1, request_group_items: 1, loans: 3, loan_items: 3, returns: 2, return_items: 2, maintenance_records: 1, inventory_movements: 6, audit_logs: 0 }
const admin = createAdminReadClient()

function fail(code) {
  const label = stage === 'seeded' ? 'SEEDED' : stage === 'delta' ? 'DELTA' : stage === 'post-cleanup' ? 'POST_CLEANUP' : 'PRE_STATE'
  console.error(`FLOW_R3_${label}: FAIL\nCATEGORY: ${code}`)
  process.exit(1)
}
async function count(table) {
  const result = await admin.from(table).select('id', { count: 'exact', head: true })
  if (result.error) fail(`count_failed_${table}`)
  return result.count ?? 0
}
async function rows(table, columns, filter) {
  const result = await filter(admin.from(table).select(columns))
  if (result.error) fail(`read_failed_${table}`)
  return result.data ?? []
}
async function verifyCounts(expected) {
  for (const [table, wanted] of Object.entries(expected)) if (await count(table) !== wanted) fail(`count_${table}`)
}

if (stage === 'pre') {
  const state = loadState()
  if (state.active_flow !== null || Object.keys(state.flows).length) fail('state_not_clean')
  const { data, error } = await admin.from('requests').select('id,purpose').like('purpose', 'E2E_MUT_REQ_R3_%')
  if (error) fail('namespace_read_failed')
  if ((data ?? []).length) fail('residual_present')
  console.log('FLOW_R3_PRE_STATE: PASS\nREMOTE_WRITES: 0')
  process.exit(0)
}

const state = loadState()
const flow = state.flows?.['FLOW-R3']
const requestId = flow?.request_id
const dataState = JSON.parse(fs.readFileSync('.e2e-state/test-data.json', 'utf8'))
const profileState = JSON.parse(fs.readFileSync('.e2e-state/profiles.json', 'utf8'))
const bulkId = dataState.records?.E2E_ITEM_BULK?.id
const studentId = profileState.profiles?.e2e_student?.id
const adminId = profileState.profiles?.e2e_admin?.id
if (!flow || state.active_flow !== 'FLOW-R3' || !requestId || flow.entities?.length !== 1 || !bulkId || !studentId || !adminId) fail('tracked_state_missing')

if (stage === 'post-cleanup') {
  const remaining = await rows('requests', 'id,purpose', (q) => q.eq('id', requestId))
  const children = await rows('request_items', 'id', (q) => q.eq('request_id', requestId))
  const residuals = await rows('requests', 'id,purpose', (q) => q.like('purpose', 'E2E_MUT_REQ_R3_%'))
  if (remaining.length || children.length || residuals.length) fail('residual_fixture_present')
  await verifyCounts(baseline)
  console.log('FLOW_R3_POST_CLEANUP: PASS\nREMOTE_RESIDUALS: 0')
  process.exit(0)
}

const requests = await rows('requests', 'id,user_id,status,purpose,approved_by,approved_at,rejection_reason', (q) => q.eq('id', requestId))
if (requests.length !== 1) fail('request_not_unique')
const items = await rows('request_items', 'id,request_id,item_id,quantity_requested,quantity_approved', (q) => q.eq('request_id', requestId))
if (items.length !== 1 || items[0].item_id !== bulkId || items[0].quantity_requested !== 1) fail('request_item_contract_mismatch')
const loans = await rows('loans', 'id', (q) => q.eq('request_id', requestId))
if (loans.length) fail('loan_association_present')

if (stage === 'seeded') {
  if (requests[0].user_id !== studentId || requests[0].status !== 'pending' || requests[0].purpose !== flow.correlation_marker || items[0].quantity_approved !== 0) fail('seeded_contract_mismatch')
  await verifyCounts({ ...baseline, requests: 5, request_items: 5 })
  console.log('FLOW_R3_SEEDED: PASS\nREMOTE_WRITES: 0')
  process.exit(0)
}

if (stage === 'delta') {
  if (requests[0].user_id !== studentId || requests[0].status !== 'approved' || requests[0].purpose !== flow.correlation_marker || requests[0].approved_by !== adminId || !requests[0].approved_at || requests[0].rejection_reason !== null || items[0].quantity_approved !== 1) fail('approval_contract_mismatch')
  await verifyCounts({ ...baseline, requests: 5, request_items: 5 })
  const bulk = await rows('items', 'id,stock_total,stock_available', (q) => q.eq('id', bulkId))
  if (bulk.length !== 1 || bulk[0].stock_total !== 10 || bulk[0].stock_available !== 8 || await count('inventory_movements') !== 6) fail('unexpected_inventory_delta')
  console.log('FLOW_R3_DELTA: PASS\nREQUEST_DELTA: 1_SEED_0_APPROVE\nREQUEST_ITEMS_DELTA: 1_SEED_0_APPROVE\nSTATUS_TRANSITION: pending_to_approved\nINVENTORY_DELTA: 0\nMOVEMENTS_DELTA: 0\nLOANS_DELTA: 0\nRETURNS_DELTA: 0\nMAINTENANCE_DELTA: 0')
  process.exit(0)
}
