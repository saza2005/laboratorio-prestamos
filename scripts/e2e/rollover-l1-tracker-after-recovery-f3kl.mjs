import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = '/home/saza/Proyectos/laboratorio-prestamos-e2e'
const trackerPath = '.e2e-state/runtime/l1-b-snapshot.json'
const historyPath = '.e2e-state/runtime/l1-b-attempt-history.json'
const expected = {
  runner: '242903f4a2e4414c720e32150b77d31065f2e93e6869115238be8eedde15fc74',
  cleanup: '1bf5f5d8e69cf4b463804f67e0fce28f1f35f454d1faa10685a6c1fea55359d0',
  f3ig: 'ba2a9b30734fa297abeafc530e576602b8f98f3bf2b20cbc56af8e6c8b56a5f6',
  recovery: '106448eb9d2de893ce96626c2cecaaa99ca31a46c8a48def21f431e241011de1',
}

function fail(code) {
  console.error(`L1_F3KL_ROLLOVER: FAIL_CLOSED (${code})`)
  process.exitCode = 1
  throw new Error(code)
}

function requireProof(condition, code) {
  if (!condition) fail(code)
}

async function hashFile(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')
}

async function writeAtomic(file, value) {
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`
  const handle = await fs.open(temp, 'w', 0o600)
  try {
    await handle.writeFile(JSON.stringify(value, null, 2) + '\n')
    await handle.sync()
  } finally {
    await handle.close()
  }
  await fs.rename(temp, file)
  const directory = await fs.open(path.dirname(file), 'r')
  await directory.sync()
  await directory.close()
}

requireProof(process.cwd() === root, 'wrong_project_workdir')
const tracker = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
requireProof(tracker.flow === 'FLOW-L1', 'flow_mismatch')
requireProof(tracker.requestCreateAttempt === 1 && tracker.approvalAttempt === 1 && tracker.deliveryAttempt === 0 && tracker.cleanupAttempt === 1, 'failed_attempt_state_mismatch')
requireProof(tracker.fixtureReady === true && tracker.remoteWriteConfirmed === true, 'recovery_precondition_mismatch')
requireProof(tracker.requestId && tracker.requestItemId && tracker.ownershipToken, 'recovered_fixture_reference_missing')
requireProof(tracker.referenceIds?.studentId && tracker.referenceIds?.staffId && tracker.referenceIds?.itemId, 'baseline_reference_missing')
requireProof(!await fs.lstat(historyPath).then(() => true).catch(() => false), 'history_already_exists')

const artifactHashes = {
  runner: await hashFile('scripts/e2e/run-flow-l1-b-delivery-v3.mjs'),
  cleanup: await hashFile('scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'),
  f3ig: await hashFile('tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'),
  recovery: await hashFile('scripts/e2e/recover-l1-failed-fixture-f3ki.mjs'),
}
requireProof(artifactHashes.runner === expected.runner, 'runner_hash_mismatch')
requireProof(artifactHashes.cleanup === expected.cleanup, 'cleanup_hash_mismatch')
requireProof(artifactHashes.f3ig === expected.f3ig, 'f3ig_hash_mismatch')
requireProof(artifactHashes.recovery === expected.recovery, 'recovery_hash_mismatch')

const envText = await fs.readFile('.env.e2e', 'utf8')
const expectedRef = (envText.match(/^E2E_EXPECTED_PROJECT_REF=(.+)$/m) ?? [])[1]?.trim()
const publicUrl = (envText.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m) ?? [])[1]?.trim()
requireProof(expectedRef && publicUrl === `https://${expectedRef}.supabase.co`, 'e2e_project_identity')
const authState = await fs.lstat('.e2e-state/playwright/lab-staff.json')
requireProof(authState.isFile(), 'lab_staff_auth_state_missing')
requireProof(!authState.isSymbolicLink(), 'lab_staff_auth_state_symlink')

const preHash = await hashFile(trackerPath)
const runId = 'L1-B-' + Date.now().toString(36) + '-' + crypto.randomUUID().slice(0, 8)
const historyRecord = {
  schemaVersion: 1,
  state: 'RECOVERED_AND_ARCHIVED',
  archivedAt: new Date().toISOString(),
  flow: 'FLOW-L1',
  sourceTrackerSha256: preHash,
  consumedAttemptCounters: {
    requestCreateAttempt: tracker.requestCreateAttempt,
    approvalAttempt: tracker.approvalAttempt,
    deliveryAttempt: tracker.deliveryAttempt,
    cleanupAttempt: tracker.cleanupAttempt,
  },
  attemptOutcome: 'APPROVED_PREDELIVERY_OWNED_RESIDUAL',
  recovery: {
    tool: 'recover-l1-failed-fixture-f3ki.mjs',
    result: 'MUTATION_COMPLETE_POST_VERIFY_PASS',
    consumed: true,
  },
  artifactHashes,
  historicalBudgetsPreserved: true,
  failedAttemptHistoryPreserved: true,
}

// History is committed and verified before the active snapshot changes.
await writeAtomic(historyPath, { schemaVersion: 1, records: [historyRecord] })
const savedHistory = JSON.parse(await fs.readFile(historyPath, 'utf8'))
requireProof(savedHistory.records?.length === 1 && savedHistory.records[0].sourceTrackerSha256 === preHash, 'history_verification_failed')
const historyHash = await hashFile(historyPath)

const active = {
  ...tracker,
  runId,
  purpose: `E2E_MUT_REQ_L1_${runId}`,
  loanMarker: `E2E_MUT_LOAN_L1_${runId}`,
  requestCreateAttempt: 0,
  approvalAttempt: 0,
  deliveryAttempt: 0,
  cleanupAttempt: 0,
  remoteWriteConfirmed: false,
  fixtureReady: false,
  capturedAt: new Date().toISOString(),
  requestId: undefined,
  requestItemId: undefined,
  ownershipToken: undefined,
  createFailureClass: undefined,
}
await writeAtomic(trackerPath, active)

const post = JSON.parse(await fs.readFile(trackerPath, 'utf8'))
requireProof(post.requestCreateAttempt === 0 && post.approvalAttempt === 0 && post.deliveryAttempt === 0 && post.cleanupAttempt === 0, 'active_counter_reset_failed')
requireProof(!post.requestId && !post.requestItemId && !post.ownershipToken && post.fixtureReady !== true, 'active_fixture_reference_not_cleared')
requireProof((await hashFile(historyPath)) === historyHash, 'history_post_verification_failed')
console.log('L1_F3KL_ROLLOVER: PASS HISTORY_ARCHIVED ACTIVE_TRACKER_PRISTINE')
