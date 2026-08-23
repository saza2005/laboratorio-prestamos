import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { loadState, registerCreatedEntity } from './lib/mutating-state.mjs'
function fail(code) { console.error('RECOVERY: FAIL'); console.error('CATEGORY: ' + code); process.exit(1) }
const args = process.argv.slice(2)
if (!args.includes('--confirm-e2e') || !args.includes('--flow=FLOW-R1')) fail('missing_arguments')
if (args.some((arg) => !['--confirm-e2e','--flow=FLOW-R1'].includes(arg))) fail('unknown_argument')
const state = loadState()
const flow = state.flows['FLOW-R1']
if (state.active_flow !== 'FLOW-R1' || !flow?.correlation_marker) fail('recovery_metadata_missing')
if (flow.request_id) { console.log('RECOVERY: ALREADY_TRACKED'); process.exit(0) }
const client = createAdminReadClient()
const { data: rows, error } = await client.from('requests').select('id,status,purpose,comments,user_id').eq('purpose', flow.correlation_marker)
if (error) fail('recovery_read_failed')
if ((rows ?? []).length === 0) { console.log('RECOVERY: NO_WRITE_DETECTED'); console.log('REMOTE_WRITES: 0'); process.exit(0) }
if ((rows ?? []).length !== 1) fail('AMBIGUOUS_RECOVERY')
const row = rows[0]
if (row.status !== 'pending' || row.purpose !== flow.correlation_marker) fail('recovered_request_not_safe')
const { data: profile, error: profileError } = await client.from('profiles').select('id,role').eq('id', row.user_id).maybeSingle()
if (profileError || profile?.role !== flow.owner_role) fail('recovered_owner_mismatch')
registerCreatedEntity('FLOW-R1', 'request', row.id)
console.log('RECOVERY: REQUEST_RECOVERED')
console.log('REMOTE_WRITES: 0')
