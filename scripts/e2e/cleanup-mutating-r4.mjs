import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { canArmR4Cleanup } from './lib/r4-identity.mjs'

const args = new Set(process.argv.slice(2))
if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-R4')) fail('missing_arguments')
if ([...args].some((arg) => !['--confirm-e2e', '--flow=FLOW-R4', '--dry-run', '--execute'].includes(arg))) fail('unknown_argument')

if (args.has('--execute')) {
  if (process.env.E2E_MUTATING_CONFIRM !== 'FLOW-R4-CLEANUP') fail('cleanup_confirmation_mismatch')
  const snapshotPath = '.e2e-state/runtime/r4-pre-snapshot.json'
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
  if (!canArmR4Cleanup({ capturedIds: snapshot.capturedIds, candidateCount: 1 })) fail('exact_cleanup_ids_missing')
  const ids = snapshot.capturedIds
  const admin = createAdminReadClient()
  const profileState = JSON.parse(await fs.readFile('.e2e-state/profiles.json', 'utf8'))
  const teacherId = profileState.profiles.e2e_teacher.id
  const request = await admin.from('requests').select('id,user_id,purpose,status').eq('id', ids.requestId).maybeSingle()
  if (request.error || !request.data || request.data.user_id !== teacherId || request.data.purpose !== snapshot.purpose || request.data.status !== 'pending') fail('cleanup_parent_contract_mismatch')

  const tracking = { ...snapshot, cleanupAttemptCount: 1 }
  await fs.writeFile(snapshotPath, JSON.stringify(tracking, null, 2) + '\n', { mode: 0o600 })
  await fs.chmod(snapshotPath, 0o600)

  const deletes = [
    ['request_group_items', ids.requestGroupItemIds],
    ['request_groups', ids.requestGroupIds],
    ['request_items', ids.requestItemIds],
    ['requests', [ids.requestId]],
  ]
  for (const [table, tableIds] of deletes) {
    const result = await admin.from(table).delete().in('id', tableIds)
    if (result.error) fail('cleanup_delete_failed')
  }
  console.log('CLEANUP_MODE: EXECUTE')
  console.log('CLEANUP_EXACT_ID_ONLY: yes')
  console.log('R4_REAL1_CLEANUP_EXECUTIONS: 1')
  console.log('REMOTE_WRITES: authorized_cleanup_only')
  process.exit(0)
}

console.log('CLEANUP_MODE: DRY_RUN')
console.log('ACTIVE_FLOW: FLOW-R4')
console.log('CLEANUP_ORDER: request_group_items -> request_groups -> request_items -> requests')
console.log('CLEANUP_EXACT_ID_ONLY: yes')
console.log('REMOTE_WRITES: 0')

function fail(code) {
  console.error('CLEANUP_MODE: FAIL\nCATEGORY: ' + code)
  process.exit(1)
}
