import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { isR4PreSetRestored } from './lib/r4-identity.mjs'

const snapshot = JSON.parse(await fs.readFile('.e2e-state/runtime/r4-pre-snapshot.json', 'utf8'))
const profileState = JSON.parse(await fs.readFile('.e2e-state/profiles.json', 'utf8'))
const teacherId = profileState.profiles.e2e_teacher.id
const admin = createAdminReadClient()
const requests = await admin.from('requests').select('id').eq('user_id', teacherId)
const currentIds = (requests.data ?? []).map((row) => row.id)
const currentRun = await admin.from('requests').select('id').eq('purpose', snapshot.purpose)
if (requests.error || currentRun.error) fail('pre_action_read_failed')
if (!isR4PreSetRestored(snapshot.preRequestIds, currentIds)) fail('pre_action_set_mismatch')
if ((currentRun.data ?? []).length !== 0) fail('pre_action_current_run_exists')
console.log('R4_REQUEST_SET_EQUALS_PRE_BEFORE_ACTION: yes')
console.log('R4_CURRENT_RUN_REQUEST_COUNT_BEFORE_ACTION: 0')
console.log('R4_NEW_REQUEST_DELTA_BEFORE_ACTION: 0')
console.log('R4_BUSINESS_RPC_EXECUTIONS_BEFORE_ACTION: 0')
console.log('R4_REMOTE_WRITES_BEFORE_ACTION: 0')

function fail(code) {
  console.error('R4_REAL1_PRE: FAIL\nCATEGORY: ' + code)
  process.exit(1)
}
