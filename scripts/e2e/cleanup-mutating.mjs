import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { spawnSync } from 'node:child_process'
import { loadState, markCleanupComplete } from './lib/mutating-state.mjs'

function fail(code) {
  console.error('CLEANUP_MODE: FAIL')
  console.error('CATEGORY: ' + code)
  process.exit(1)
}

const args = process.argv.slice(2)
if (!args.includes('--confirm-e2e')) fail('missing_confirm_e2e')
const flowArg = args.find((arg) => arg.startsWith('--flow='))
if (!['--flow=FLOW-R1','--flow=FLOW-R2','--flow=FLOW-R3'].includes(flowArg)) fail('flow_not_allowlisted')
const execute = args.includes('--execute')
if (args.some((arg) => !['--confirm-e2e','--execute','--flow=FLOW-R1','--flow=FLOW-R2','--flow=FLOW-R3'].includes(arg))) fail('unknown_argument')
if (execute && !process.env.E2E_MUTATING_CONFIRM) fail('missing_mutating_confirmation')

let state
try { state = loadState() } catch { fail('invalid_mutating_state') }
if (flowArg === '--flow=FLOW-R2') {
  const result = spawnSync(process.execPath, ['scripts/e2e/cleanup-mutating-r2.mjs', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env })
  process.exit(result.status ?? 1)
}
if (flowArg === '--flow=FLOW-R3') {
  const result = spawnSync(process.execPath, ['scripts/e2e/cleanup-mutating-r3.mjs', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env })
  process.exit(result.status ?? 1)
}
const flow = state.flows['FLOW-R1']
const active = state.active_flow ?? 'none'
if (active === 'none') {
  if (execute) fail('no_active_flow')
  console.log('CLEANUP_MODE: DRY_RUN')
  console.log('ACTIVE_FLOW: none')
  console.log('TARGETS: 0')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}
if (!flow || flow.namespace !== 'E2E_MUT_REQ_R1_') fail('invalid_flow_state')
if (!flow.cleanup_required || flow.entities.length !== 1) fail('cleanup_state_not_exact')
const request = flow.entities.find((entity) => entity.type === 'request')
if (!request || !request.id || request.namespace !== flow.namespace) fail('request_target_not_allowlisted')

const client = createAdminReadClient()
const { data: requestRow, error: requestError } = await client
  .from('requests')
  .select('id,status,purpose,comments')
  .eq('id', request.id)
  .maybeSingle()
if (requestError) fail('request_read_failed')
if (!requestRow) fail('request_target_missing')
if (requestRow.status !== 'pending') fail('request_state_not_safe')
if (![requestRow.purpose, requestRow.comments].some((value) => String(value ?? '').includes(flow.namespace))) fail('request_namespace_mismatch')

const { data: children, error: childError } = await client
  .from('request_items')
  .select('id,request_id')
  .eq('request_id', request.id)
if (childError) fail('request_children_read_failed')
if ((children ?? []).some((child) => child.request_id !== request.id)) fail('request_child_mismatch')

const { data: groups, error: groupError } = await client
  .from('request_groups')
  .select('id,request_id')
  .eq('request_id', request.id)
if (groupError) fail('request_groups_read_failed')
if ((groups ?? []).length) fail('grouped_request_not_supported_by_r1_cleanup')

const { data: loans, error: loanError } = await client
  .from('loans')
  .select('id,request_id')
  .eq('request_id', request.id)
if (loanError) fail('loan_reference_read_failed')
if ((loans ?? []).length) fail('loan_reference_blocks_cleanup')

if (!execute) {
  console.log('CLEANUP_MODE: DRY_RUN')
  console.log('ACTIVE_FLOW: FLOW-R1')
  console.log('TARGETS: ' + (1 + (children ?? []).length))
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}

if (process.env.E2E_MUTATING_CONFIRM !== 'FLOW-R1-CLEANUP') fail('invalid_mutating_confirmation')
const nextState = { ...state, flows: { ...state.flows, 'FLOW-R1': { ...flow, status: 'CLEANUP_RUNNING' } } }
const { atomicWrite } = await import('./lib/mutating-state.mjs')
atomicWrite(nextState)

try {
  for (const child of children ?? []) {
    const result = await client.from('request_items').delete().eq('id', child.id).select('id')
    if (result.error || (result.data ?? []).length !== 1) throw new Error('request_child_delete_failed')
  }
  const result = await client.from('requests').delete().eq('id', request.id).select('id')
  if (result.error || (result.data ?? []).length !== 1) throw new Error('request_delete_failed')
  markCleanupComplete('FLOW-R1')
} catch {
  fail('cleanup_failed_state_preserved')
}
console.log('CLEANUP_MODE: EXECUTE')
console.log('ACTIVE_FLOW: FLOW-R1')
console.log('TARGETS: ' + (1 + (children ?? []).length))
console.log('REMOTE_WRITES: ' + (1 + (children ?? []).length))
