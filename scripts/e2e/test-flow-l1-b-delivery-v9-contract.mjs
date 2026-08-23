import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { dirname, fileURLToPath } from 'node:url'

const checkerDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(checkerDir, '..', '..')
const runnerPath = 'scripts/e2e/run-flow-l1-b-delivery-v3.mjs'
const specPath = 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'
const cleanupPath = 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'
const pins = {
  [runnerPath]: '242903f4a2e4414c720e32150b77d31065f2e93e6869115238be8eedde15fc74',
  [specPath]: '781f498a12cd8ad8045c9a57ff37417ce91f1e683a5962b060f3141da08feef7',
  [cleanupPath]: '1bf5f5d8e69cf4b463804f67e0fce28f1f35f454d1faa10685a6c1fea55359d0',
}

function fail(code) {
  console.error(`FAIL:${code}`)
  process.exitCode = 1
  throw new Error(code)
}

function assert(condition, code) {
  if (!condition) fail(code)
}

function readTarget(relativePath) {
  const absolute = path.resolve(projectRoot, relativePath)
  assert(absolute.startsWith(`${projectRoot}${path.sep}`), `path_scope:${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

function digest(source) {
  return crypto.createHash('sha256').update(source).digest('hex')
}

function matchingBrace(source, openIndex) {
  assert(source[openIndex] === '{', 'scope_open')
  let depth = 0
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i]
    const next = source[i + 1]
    if (lineComment) {
      if (ch === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false
        i += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '/' && next === '/') {
      lineComment = true
      i += 1
      continue
    }
    if (ch === '/' && next === '*') {
      blockComment = true
      i += 1
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '{') depth += 1
    if (ch === '}') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  fail('unbalanced_scope')
}

function scope(source, marker, label = marker) {
  const markerAt = source.indexOf(marker)
  assert(markerAt >= 0, `missing_scope:${label}`)
  const openAt = source.indexOf('{', markerAt + marker.length)
  assert(openAt >= 0, `missing_scope_open:${label}`)
  return source.slice(openAt, matchingBrace(source, openAt) + 1)
}

function count(source, token) {
  return source.split(token).length - 1
}

function position(source, token, label) {
  const result = source.indexOf(token)
  assert(result >= 0, `missing:${label}`)
  return result
}

function sequence(source, tokens, label) {
  let cursor = -1
  for (const token of tokens) {
    const next = source.indexOf(token, cursor + 1)
    assert(next >= 0, `sequence:${label}:${token}`)
    cursor = next
  }
}

function forbid(source, token, label) {
  assert(!source.includes(token), `forbidden:${label}:${token}`)
}

const runner = readTarget(runnerPath)
const spec = readTarget(specPath)
const cleanup = readTarget(cleanupPath)
assert(digest(runner) === pins[runnerPath], 'runner_hash')
assert(digest(spec) === pins[specPath], 'spec_hash')
assert(digest(cleanup) === pins[cleanupPath], 'cleanup_hash')

assert(runner.includes(`const actualSpec = '${specPath}'`), 'exact_spec_binding')
assert(runner.includes(`const cleanupPath = '${cleanupPath}'`), 'exact_cleanup_binding')
for (const oldPath of [
  'cleanup-l1-fixture.mjs',
  'cleanup-l1-delivery-fixture.mjs',
  'cleanup-l1-delivery-fixture-v3.mjs',
  'cleanup-l1-delivery-fixture-v4.mjs',
  'cleanup-l1-delivery-fixture-v5.mjs',
  'cleanup-l1-delivery-fixture-v6.mjs',
  'cleanup-l1-delivery-fixture-v7.mjs',
  'cleanup-l1-delivery-fixture-v8.mjs',
  'cleanup-l1-delivery-fixture-v9.mjs',
]) forbid(runner, oldPath, 'alternate_cleanup')

const environment = scope(runner, 'function makeBrowserEnvironment(', 'child_environment')
assert(environment.includes("RESEND_API_KEY: ''"), 'empty_resend_key')
assert(runner.includes('env: childEnv'), 'child_environment_binding')
assert(runner.includes('EMAIL_PROVIDER_MAX_SUBMISSIONS: 0'), 'zero_email_cap')
forbid(environment, 'delete ', 'unset_email_key')

const transport = scope(runner, 'fs.rmSync(eventPath, { force: true })', 'transport_reset')
forbid(transport, "writeEvent('BROWSER_READY')", 'runner_ready_emission')
forbid(runner, "writeEvent('BROWSER_READY')", 'runner_ready_global')
assert(spec.includes("writeSignal('BROWSER_READY')"), 'spec_ready_signal')
assert(spec.includes("writeEvent('BROWSER_READY')"), 'spec_ready_event')
assert(runner.includes("waitForHandshake('BROWSER_READY')"), 'runner_ready_wait')

const race = scope(runner, 'async function waitForResultOrChildExit()', 'result_or_exit')
assert(race.includes("state === 'DELIVERY_RESULT_OBSERVED'"), 'result_candidate')
assert(race.includes('child.exitCode !== null'), 'child_exit_candidate')
assert(race.includes("return 'result'"), 'result_return')
assert(race.includes("return 'child_exit'"), 'child_exit_return')
assert(race.includes('while ('), 'race_poll')
const lifecycle = scope(runner, 'try {\n  await waitForHandshake', 'normal_lifecycle')
const recoveryMarker = '} catch (error) {'
const recovery = scope(runner, recoveryMarker, 'error_recovery')
assert(runner.includes(recoveryMarker), 'parent_catch_exists')
sequence(lifecycle, [
  'const terminal = await waitForResultOrChildExit()',
  "if (terminal === 'result')",
  "writeEvent('CLEANUP_REQUIRED')",
  'const childCode = await waitForChild()',
  'await runCleanupOnce()',
], 'postattempt')
assert(lifecycle.includes('writeCleanupAuditEvent()'), 'child_exit_audit')
assert(count(lifecycle, 'await runCleanupOnce()') === 1, 'normal_cleanup_once')
forbid(lifecycle, "writeEvent('CLEANUP_REQUIRED')\n  const childCode", 'early_cleanup')

const delivery = scope(runner, 'function consumeDeliveryAttempt()', 'delivery_attempt')
sequence(delivery, ['deliveryAttempt !== 0', 'deliveryAttempt: 1'], 'delivery_transition')
const attemptAt = position(lifecycle, 'consumeDeliveryAttempt()', 'delivery_call')
const authAt = position(lifecycle, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')", 'authorization')
assert(attemptAt < authAt, 'delivery_before_authorization')
assert(count(lifecycle, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')") === 1, 'authorization_once')
forbid(runner, 'deliveryAttempt: 0', 'delivery_reset')

const auditDeclaration = scope(runner, 'function writeCleanupAuditEvent()', 'audit_declaration')
assert(auditDeclaration.includes('atomicEventWrite'), 'audit_declaration_body')
const normalAuditCalls = count(lifecycle, 'writeCleanupAuditEvent()')
const recoveryAuditCalls = count(recovery, 'writeCleanupAuditEvent()')
assert(normalAuditCalls === 1, 'normal_audit_call_site')
assert(recoveryAuditCalls === 1, 'recovery_audit_call_site')
assert(count(auditDeclaration, 'writeCleanupAuditEvent()') === 0, 'declaration_excluded')
assert(recovery.includes('if (!cleanupAttempted && canRecover())'), 'recovery_audit_guard')
assert(normalAuditCalls + recoveryAuditCalls === 2, 'audit_call_site_count')
assert(recovery.includes('!cleanupAttempted'), 'recovery_scope_behavior')

const cleanupOnce = scope(runner, 'async function runCleanupOnce()', 'cleanup_once')
assert(cleanupOnce.includes('if (cleanupAttempted) throw'), 'cleanup_once_guard')
assert(cleanupOnce.includes('execFileSync'), 'cleanup_process_launch')
assert(cleanupOnce.indexOf('execFileSync') < cleanupOnce.indexOf('clearRecoveryState()'), 'cleanup_success')
assert(count(lifecycle, 'await runCleanupOnce()') === 1, 'normal_cleanup_call')
assert(count(recovery, 'await runCleanupOnce()') === 1, 'recovery_cleanup_call')
assert(recovery.includes('!cleanupAttempted'), 'recovery_cleanup_guard')

const completeAt = position(lifecycle, "writeEvent('COMPLETE')", 'complete')
const childExitAt = position(lifecycle, 'const childCode = await waitForChild()', 'child_exit')
const cleanupAt = position(lifecycle, 'await runCleanupOnce()', 'cleanup')
const childFailureAt = position(lifecycle, "if (childCode !== 0) fail('delivery_browser_failed_after_cleanup')", 'child_failure')
assert(count(lifecycle, "writeEvent('COMPLETE')") === 1, 'complete_site_count')
assert(childExitAt < cleanupAt && cleanupAt < childFailureAt && childFailureAt < completeAt, 'complete_dominance')
forbid(recovery, "writeEvent('COMPLETE')", 'error_complete')

const stateNames = [
  'NO_FIXTURE_PRESENT',
  'PENDING_PREDELIVERY',
  'APPROVED_PREDELIVERY',
  'FULLY_DELIVERED_MINIMAL_BULK',
  'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE',
]
for (const state of stateNames) assert(count(cleanup, state) > 0, `state:${state}`)
const classifier = scope(cleanup, 'function classify(', 'classifier')
const classificationAt = position(cleanup, 'const classification = classify(', 'classification')
const firstMutationAt = Math.min(...[cleanup.indexOf('deleteExactly('), cleanup.indexOf('restoreStock(')].filter((value) => value >= 0))
assert(classificationAt < firstMutationAt, 'classification_before_mutation')
assert(count(cleanup, 'const classification = classify(') === 1, 'one_classification')
assert(classifier.includes('requestGroups.length === 0'), 'group_graph_filter')
assert(classifier.includes('loanGroups.length === 0'), 'loan_graph_filter')
assert(classifier.includes('units.length === 0'), 'unit_graph_filter')
assert(classifier.includes('returns.length === 0'), 'return_graph_filter')
assert(classifier.includes("graph.request.status === 'pending'"), 'pending_filter')
assert(classifier.includes("graph.request.status === 'approved'"), 'approved_filter')
assert(classifier.includes("graph.request.status === 'delivered'"), 'delivered_filter')
assert(classifier.includes('return full ?'), 'unknown_filter')

const noFixture = scope(cleanup, "if (classification === 'NO_FIXTURE_PRESENT')", 'no_fixture')
assert(noFixture.includes('process.exit(0)'), 'no_fixture_exit')
forbid(noFixture, 'deleteExactly(', 'no_fixture_mutation')
forbid(noFixture, 'restoreStock(', 'no_fixture_stock')
const unknown = scope(cleanup, "if (classification === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE')", 'unknown')
assert(unknown.includes("fail('unexpected_or_ambiguous_structure')"), 'unknown_fail')
forbid(unknown, 'deleteExactly(', 'unknown_mutation')
forbid(unknown, 'restoreStock(', 'unknown_stock')

const preBranch = scope(cleanup, "if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY')", 'predelivery')
sequence(preBranch, ["deleteExactly(admin, 'request_items'", "deleteExactly(admin, 'requests'"], 'predelivery_sequence')
assert(count(preBranch, 'deleteExactly(') === 2, 'predelivery_count')
assert(preBranch.includes('process.exit(0)'), 'predelivery_exit')
forbid(preBranch, 'catch', 'predelivery_fallback')

const fullStart = position(cleanup, 'await restoreStock(', 'full_start')
const fullEnd = position(cleanup.slice(fullStart), "console.log('L1_DELIVERY_CLEANUP_V2_SEQUENCE:", 'full_end') + fullStart
const fullBranch = cleanup.slice(fullStart, fullEnd)
sequence(fullBranch, [
  'await restoreStock(',
  "deleteExactly(admin, 'inventory_movements'",
  "deleteExactly(admin, 'loan_items'",
  "deleteExactly(admin, 'loans'",
  "deleteExactly(admin, 'request_items'",
  "deleteExactly(admin, 'requests'",
], 'full_sequence')
assert(count(fullBranch, 'await restoreStock(') === 1, 'stock_count')
assert(count(fullBranch, 'deleteExactly(') === 5, 'full_delete_count')
forbid(fullBranch, 'catch', 'full_fallback')

const deleteHelper = scope(cleanup, 'async function deleteExactly(', 'delete_helper')
const restoreHelper = scope(cleanup, 'async function restoreStock(', 'restore_helper')
const failHelper = scope(cleanup, 'function fail(', 'fail_helper')
assert(deleteHelper.includes('for (const [key, value]'), 'predicate_loop')
forbid(deleteHelper, 'deleteExactly(', 'delete_recursion')
forbid(restoreHelper, 'restoreStock(', 'restore_recursion')
assert(failHelper.includes('process.exit(1)'), 'failure_exit')
forbid(cleanup, 'setInterval(', 'retry_timer')
forbid(cleanup, 'readWithBoundedRetry', 'helper_retry')
forbid(cleanup, 'catch', 'mutation_catch_fallback')
for (const oldPath of [
  'cleanup-l1-fixture.mjs',
  'cleanup-l1-delivery-fixture.mjs',
  'cleanup-l1-delivery-fixture-v3.mjs',
  'cleanup-l1-delivery-fixture-v4.mjs',
  'cleanup-l1-delivery-fixture-v5.mjs',
  'cleanup-l1-delivery-fixture-v6.mjs',
  'cleanup-l1-delivery-fixture-v7.mjs',
  'cleanup-l1-delivery-fixture-v8.mjs',
  'cleanup-l1-delivery-fixture-v9.mjs',
]) forbid(cleanup, oldPath, 'cleanup_fallback')

assert(runner.includes("spawn('npx', ['playwright', 'test', actualSpec"), 'positive_npx_playwright_launch')
assert(runner.includes(`actualSpec = '${specPath}'`), 'launch_exact_spec')
assert(runner.includes("'--project=chromium-lab-staff'"), 'launch_exact_project')
assert(runner.includes('cwd: root'), 'launch_root_binding')
assert(runner.includes('env: childEnv'), 'launch_e2e_env')
assert(runner.includes("process.cwd() !== root"), 'normal_route_rejected')
forbid(runner, 'E2E_REUSE_EXISTING_SERVER', 'unsafe_server_reuse')
forbid(runner, 'deliverRequestWithState', 'production_action')
forbid(runner, 'deliver_approved_request_with_units', 'production_rpc')

console.log('PASS:F3JA_STATIC_CONTRACT')
