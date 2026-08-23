import fs from 'node:fs'

const paths = {
  migration: 'supabase/migrations/20260818_add_e2e_fixture_ownership_token.sql',
  prepare: 'scripts/e2e/prepare-l1-fixture.mjs',
  cleanup: 'scripts/e2e/cleanup-l1-fixture.mjs',
  runner: 'scripts/e2e/run-flow-l1-b.mjs',
  verifier: 'scripts/e2e/verify-l1-b-fixture.mjs',
  spec: 'tests/e2e/mutating/request-delivery-l1-b.rehearsal.spec.ts',
}
const files = Object.fromEntries(Object.entries(paths).map(([name, file]) => [name, fs.readFileSync(file, 'utf8')]))

function ordered(source, ...tokens) {
  let offset = -1
  for (const token of tokens) {
    const next = source.indexOf(token, offset + 1)
    if (next < 0) return false
    offset = next
  }
  return true
}

const businessColumns = ['id', 'user_id', 'requested_at', 'status', 'purpose', 'comments', 'scheduled_return_date', 'approved_by', 'approved_at', 'rejection_reason', 'created_at', 'updated_at']
const checks = [
  ['migration adds exact token column', files.migration.includes('alter table public.requests') && files.migration.includes('add column e2e_fixture_token uuid')],
  ['migration has partial unique token index', ordered(files.migration, 'create unique index requests_e2e_fixture_token_unique', 'on public.requests (e2e_fixture_token)', 'where e2e_fixture_token is not null')],
  ['migration fails closed on drift', !files.migration.includes('IF NOT EXISTS')],
  ['migration revokes ordinary table privileges', files.migration.includes('revoke all privileges') && files.migration.includes('from anon, authenticated')],
  ['migration grants only business-column select', businessColumns.every((column) => files.migration.includes(`  ${column},`) || files.migration.includes(`  ${column}\n`))],
  ['token excluded from ordinary select grant', !/grant select \([\s\S]*e2e_fixture_token[\s\S]*\)\s*on table public\.requests\s*to anon, authenticated/i.test(files.migration)],
  ['migration has no unexpected database objects', !/create\s+(or replace\s+)?(function|trigger|table)\b/i.test(files.migration)],
  ['fixture request uses direct service-role insert', files.prepare.includes("admin.from('requests').insert(") && !files.prepare.includes('create_request_transaction')],
  ['request and item IDs use random UUIDs', files.prepare.includes('const requestId = crypto.randomUUID()') && files.prepare.includes('const requestItemId = crypto.randomUUID()')],
  ['ownership token uses random UUID', files.prepare.includes('const ownershipToken = crypto.randomUUID()')],
  ['recovery state precedes create attempt', ordered(files.prepare, 'requestCreateAttempt: 0', 'requestCreateAttempt: 1', ".from('requests').insert(")],
  ['collision checks precede create attempt', ordered(files.prepare, 'fixture_collision_read_failed', 'requestCreateAttempt: 1')],
  ['request insert stores token', files.prepare.includes('e2e_fixture_token: ownershipToken')],
  ['request identity is verified', ordered(files.prepare, 'created.data.id !== requestId', 'created.data.e2e_fixture_token !== ownershipToken')],
  ['duplicate request failure is classified', files.prepare.includes("known_duplicate_request") && files.prepare.includes("created.error?.code === '23505'")],
  ['approval remains lab-staff canonical RPC', files.prepare.includes("staff.rpc('approve_request_transaction'") && files.prepare.includes('E2E_LAB_STAFF_EMAIL')],
  ['cleanup attempt precedes remote pre-read', ordered(files.cleanup, 'cleanupAttempt: 1', "admin.from('requests').select")],
  ['known collision and duplicate are blocked', files.cleanup.includes("known_collision") && files.cleanup.includes("known_duplicate_request")],
  ['cleanup requires remote token ownership', files.cleanup.includes('request.data.e2e_fixture_token !== snapshot.ownershipToken')],
  ['item delete has parent predicate', files.cleanup.includes(".delete().eq('id', snapshot.requestItemId).eq('request_id', snapshot.requestId)")],
  ['request delete has token predicate', files.cleanup.includes(".delete().eq('id', snapshot.requestId).eq('e2e_fixture_token', snapshot.ownershipToken)")],
  ['cleanup helper does not clear recovery state', !files.cleanup.includes('clearRecoveryState')],
  ['nothing-to-delete preserves references', files.cleanup.includes("L1_FIXTURE_NOTHING_TO_DELETE: yes") && !files.cleanup.includes('clearRecoveryState')],
  ['runner has shared cleanup helper', files.runner.includes('function cleanupTrackedFixture()')],
  ['cleanup guard precedes subprocess', ordered(files.runner, 'cleanupInvocationAttempted = true', "scripts/e2e/cleanup-l1-fixture.mjs")],
  ['normal and failure paths share cleanup helper', files.runner.includes('cleanupTrackedFixture()')],
  ['full verifier precedes reference clear', ordered(files.runner, "stage=post-cleanup", 'clearRecoveryState()')],
  ['reference clear reads current tracker', files.runner.includes("JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))")],
  ['reference clear requires cleanup attempt one', files.runner.includes('current.cleanupAttempt !== 1')],
  ['reference clear preserves attempt counters', files.runner.includes('const next = { ...current') && !files.runner.includes('requestCreateAttempt: 0')],
  ['reference clear uses exclusive temp creation', files.runner.includes("fs.openSync(tempPath, 'wx', 0o600)")],
  ['full verifier consumes request identity', files.verifier.includes('snapshot.requestId')],
  ['runner has one cleanup guard', files.runner.includes("cleanup_retry_forbidden")],
  ['runner excludes known duplicate cleanup', files.runner.includes("createFailureClass !== 'known_duplicate_request'")],
  ['rehearsal uses lab-staff project', files.spec.includes('chromium-lab-staff')],
  ['rehearsal has zero Entregar interaction', !files.spec.includes("name: 'Entregar', exact: true")],
  ['rehearsal has no delivery Server Action', !files.spec.includes('deliverRequestWithState')],
  ['rehearsal has no delivery RPC', !files.spec.includes('deliver_approved_request_with_units')],
]

for (const [name, pass] of checks) {
  if (!pass) throw new Error(`l1_b_contract_failed:${name}`)
}

console.log('L1_B_CONTRACT_TEST: PASS')
