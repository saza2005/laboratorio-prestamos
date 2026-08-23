import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { registerFlow, registerCreatedEntity } from './lib/mutating-state.mjs'

const args = new Set(process.argv.slice(2))
const execute = args.has('--execute')
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R3')) fail('missing_or_invalid_arguments')
if (execute && process.env.E2E_MUTATING_CONFIRM !== 'FLOW-R3-SEED') fail('invalid_mutating_confirmation')
if ([...args].some((arg) => !['--confirm-e2e', '--flow=FLOW-R3', '--execute'].includes(arg))) fail('unknown_argument')

if (!execute) {
  console.log('SEED_MODE: DRY_RUN')
  console.log('FLOW: FLOW-R3')
  console.log('STRATEGY: A_REAL_CREATE_REQUEST_RPC')
  console.log('PLANNED_REQUESTS: 1')
  console.log('PLANNED_REQUEST_ITEMS: 1')
  console.log('REMOTE_WRITES: 0')
  process.exit(0)
}

const env = loadEnv()
const dataState = JSON.parse(await (await import('node:fs/promises')).readFile('.e2e-state/test-data.json', 'utf8'))
const bulkId = dataState.records?.E2E_ITEM_BULK?.id
if (!bulkId) fail('bulk_item_missing')
const marker = 'E2E_MUT_REQ_R3_' + randomBytes(10).toString('hex')
registerFlow('FLOW-R3', {
  correlation_marker: marker,
  owner_role: 'student',
  reviewer_role: 'admin',
  expected_entity_type: 'request',
  expected_quantity: 1,
  expected_final_status: 'approved',
  request_id: null,
  remote_write_confirmed: false,
  initial_status: 'pending',
  phase: 'SEED_RUNNING',
})
const actor = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
const { error: authError } = await actor.auth.signInWithPassword({ email: env.studentEmail, password: env.studentPassword })
if (authError) fail('student_auth_failed')
const item = await actor.from('items').select('status,stock_available').eq('id', bulkId).maybeSingle()
if (item.error || !item.data || item.data.status !== 'active' || Number(item.data.stock_available) < 1) fail('bulk_item_precondition_failed')
const futureDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
const created = await actor.rpc('create_request_transaction', {
  p_purpose: marker,
  p_comments: 'E2E_MUT_REQ_R3_SEED',
  p_scheduled_return_date: futureDate,
  p_items: [{ item_id: bulkId, quantity_requested: 1 }],
  p_groups: [],
})
if (created.error || !created.data) fail('seed_rpc_failed')
registerCreatedEntity('FLOW-R3', 'request', created.data)
console.log('SEED_MODE: EXECUTE')
console.log('FLOW: FLOW-R3')
console.log('REQUEST_TRACKED: yes')
console.log('REMOTE_WRITES: 1_RPC_PLUS_DERIVED_CHILDREN')

function loadEnv() {
  const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'E2E_EXPECTED_PROJECT_REF', 'E2E_STUDENT_EMAIL', 'E2E_STUDENT_PASSWORD']
  const values = Object.fromEntries(keys.map((key) => [key, String(process.env[key] ?? '').trim()]))
  if (Object.values(values).some((value) => !value)) fail('missing_seed_environment')
  const ref = new URL(values.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
  if (ref !== values.E2E_EXPECTED_PROJECT_REF) fail('project_mismatch')
  return { url: values.NEXT_PUBLIC_SUPABASE_URL, anonKey: values.NEXT_PUBLIC_SUPABASE_ANON_KEY, studentEmail: values.E2E_STUDENT_EMAIL, studentPassword: values.E2E_STUDENT_PASSWORD }
}
function fail(code) { console.error('SEED_MODE: FAIL\nCATEGORY: ' + code); process.exit(1) }
