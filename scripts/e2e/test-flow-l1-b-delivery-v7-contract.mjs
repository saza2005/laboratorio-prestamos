import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { dirname, fileURLToPath } from 'node:url'

const checkerFile = fileURLToPath(import.meta.url)
const checkerDir = dirname(checkerFile)
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
  assert(absolute === path.resolve(projectRoot, relativePath), `path_resolution:${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

function digest(source) {
  return crypto.createHash('sha256').update(source).digest('hex')
}

function assertPinned(relativePath, source) {
  assert(digest(source) === pins[relativePath], `hash:${relativePath}`)
}

function matchingBrace(source, openIndex) {
  assert(source[openIndex] === '{', 'scope_open_brace')
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

function extractScope(source, marker, label = marker) {
  const markerAt = source.indexOf(marker)
  assert(markerAt >= 0, `missing_scope:${label}`)
  const openAt = source.indexOf('{', markerAt + marker.length)
  assert(openAt >= 0, `missing_scope_open:${label}`)
  const closeAt = matchingBrace(source, openAt)
  return source.slice(openAt, closeAt + 1)
}

function functionScope(source, signature, label = signature) {
  return extractScope(source, signature, label)
}

function count(source, token) {
  return source.split(token).length - 1
}

function at(source, token, label) {
  const index = source.indexOf(token)
  assert(index >= 0, `missing:${label}`)
  return index
}

function sequence(source, tokens, label) {
  let cursor = -1
  for (const token of tokens) {
    const next = source.indexOf(token, cursor + 1)
    assert(next >= 0, `sequence:${label}:${token}`)
    cursor = next
  }
}

function noToken(source, token, label) {
  assert(!source.includes(token), `forbidden:${label}:${token}`)
}

const runner = readTarget(runnerPath)
const spec = readTarget(specPath)
const cleanup = readTarget(cleanupPath)
assertPinned(runnerPath, runner)
assertPinned(specPath, spec)
assertPinned(cleanupPath, cleanup)

assert(runner.includes(`const actualSpec = '${specPath}'`), 'runner_spec_binding')
assert(runner.includes(`const cleanupPath = '${cleanupPath}'`), 'runner_cleanup_binding')
for (const forbidden of [
  'cleanup-l1-fixture.mjs',
  'cleanup-l1-delivery-fixture.mjs',
  'cleanup-l1-delivery-fixture-v3.mjs',
  'cleanup-l1-delivery-fixture-v4.mjs',
  'cleanup-l1-delivery-fixture-v5.mjs',
  'cleanup-l1-delivery-fixture-v6.mjs',
  'cleanup-l1-delivery-fixture-v7.mjs',
]) noToken(runner, forbidden, 'runner_cleanup_target')

const environment = functionScope(runner, 'function makeBrowserEnvironment(', 'child_environment')
assert(environment.includes("RESEND_API_KEY: ''"), 'child_environment_empty_provider_key')
assert(runner.includes('env: childEnv'), 'child_environment_spawn_binding')
assert(runner.includes('EMAIL_PROVIDER_MAX_SUBMISSIONS: 0'), 'email_zero_submission_contract')
noToken(environment, 'delete ', 'child_environment_unset')

const transport = extractScope(runner, 'fs.rmSync(eventPath, { force: true })', 'event_transport_reset')
noToken(transport, "writeEvent('BROWSER_READY')", 'runner_browser_ready_emission')
noToken(runner, "writeEvent('BROWSER_READY')", 'runner_browser_ready_global')
assert(spec.includes("writeSignal('BROWSER_READY')"), 'spec_browser_ready_signal')
assert(spec.includes("writeEvent('BROWSER_READY')"), 'spec_browser_ready_event')
assert(runner.includes("waitForHandshake('BROWSER_READY')"), 'runner_waits_for_spec_ready')

const race = functionScope(runner, 'async function waitForResultOrChildExit()', 'result_or_exit')
assert(race.includes("state === 'DELIVERY_RESULT_OBSERVED'"), 'race_result_candidate')
assert(race.includes('child.exitCode !== null'), 'race_child_exit_candidate')
assert(race.includes("return 'result'"), 'race_result_return')
assert(race.includes("return 'child_exit'"), 'race_child_exit_return')
assert(race.includes('while ('), 'race_wait_loop')
const lifecycle = extractScope(runner, 'try {\n  await waitForHandshake', 'normal_lifecycle')
sequence(lifecycle, [
  'const terminal = await waitForResultOrChildExit()',
  "if (terminal === 'result')",
  "writeEvent('CLEANUP_REQUIRED')",
  'const childCode = await waitForChild()',
  'await runCleanupOnce()',
], 'postattempt')
assert(lifecycle.includes('writeCleanupAuditEvent()'), 'child_exit_audit_branch')
assert(count(lifecycle, 'await runCleanupOnce()') === 1, 'normal_cleanup_single_call')
assert(!lifecycle.includes("writeEvent('CLEANUP_REQUIRED')\n  const childCode"), 'early_cleanup_rejected')

const delivery = functionScope(runner, 'function consumeDeliveryAttempt()', 'delivery_attempt')
sequence(delivery, ['deliveryAttempt !== 0', 'deliveryAttempt: 1'], 'delivery_attempt_transition')
const attemptAt = at(lifecycle, 'consumeDeliveryAttempt()', 'delivery_attempt_call')
const authAt = at(lifecycle, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')", 'delivery_authorization')
assert(attemptAt < authAt, 'delivery_attempt_before_authorization')
assert(count(lifecycle, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')") === 1, 'authorization_once')
noToken(runner, 'deliveryAttempt: 0', 'delivery_attempt_reset')
assert(count(lifecycle, "writeEvent('DELIVERY_SUBMIT_ATTEMPTED')") === 0, 'runner_does_not_emit_attempted')
assert(count(runner, 'writeCleanupAuditEvent()') === 2, 'audit_calls_are_normal_and_recovery_only')
const errorScope = extractScope(runner, '} catch (error) {', 'runner_error_scope')
assert(errorScope.includes('if (!cleanupAttempted && canRecover())'), 'recovery_guard')
assert(count(errorScope, 'await runCleanupOnce()') === 1, 'recovery_cleanup_single_call')

const cleanupOnce = functionScope(runner, 'async function runCleanupOnce()', 'cleanup_once')
assert(cleanupOnce.includes('if (cleanupAttempted) throw'), 'cleanup_once_guard')
assert(cleanupOnce.includes('execFileSync'), 'cleanup_process_call')
assert(cleanupOnce.indexOf('execFileSync') < cleanupOnce.indexOf('clearRecoveryState()'), 'cleanup_success_commit')
assert(count(lifecycle, 'await runCleanupOnce()') === 1, 'cleanup_once_normal_branch')
assert(count(errorScope, 'await runCleanupOnce()') === 1, 'cleanup_once_error_branch')
assert(errorScope.includes('!cleanupAttempted'), 'cleanup_error_mutual_exclusion')

assert(count(runner, "writeEvent('COMPLETE')") === 1, 'complete_site_count')
const completeAt = at(lifecycle, "writeEvent('COMPLETE')", 'complete_site')
const childExitAt = at(lifecycle, 'const childCode = await waitForChild()', 'child_exit_observation')
const cleanupAt = at(lifecycle, 'await runCleanupOnce()', 'cleanup_invocation')
const childFailureAt = at(lifecycle, "if (childCode !== 0) fail('delivery_browser_failed_after_cleanup')", 'child_failure_guard')
assert(childExitAt < cleanupAt && cleanupAt < childFailureAt && childFailureAt < completeAt, 'complete_dominance')
assert(!errorScope.includes("writeEvent('COMPLETE')"), 'error_complete_rejection')

const stateNames = [
  'NO_FIXTURE_PRESENT',
  'PENDING_PREDELIVERY',
  'APPROVED_PREDELIVERY',
  'FULLY_DELIVERED_MINIMAL_BULK',
  'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE',
]
for (const state of stateNames) assert(count(cleanup, state) > 0, `cleanup_state:${state}`)
const classifier = functionScope(cleanup, 'function classify(', 'cleanup_classifier')
const classificationAt = at(cleanup, 'const classification = classify(', 'classification_call')
const firstMutationAt = Math.min(...[
  cleanup.indexOf('deleteExactly('),
  cleanup.indexOf('restoreStock('),
].filter((value) => value >= 0))
assert(classificationAt < firstMutationAt, 'classification_before_mutation')
assert(count(cleanup, 'const classification = classify(') === 1, 'single_classification')
assert(classifier.includes('requestGroups.length === 0'), 'forbidden_group_input')
assert(classifier.includes('loanGroups.length === 0'), 'forbidden_loan_group_input')
assert(classifier.includes('units.length === 0'), 'forbidden_unit_input')
assert(classifier.includes('returns.length === 0'), 'forbidden_return_input')
assert(classifier.includes("graph.request.status === 'pending'"), 'pending_status_classifier')
assert(classifier.includes("graph.request.status === 'approved'"), 'approved_status_classifier')
assert(classifier.includes("graph.request.status === 'delivered'"), 'delivered_status_classifier')
assert(classifier.includes('return full ?'), 'unknown_classifier_fallback')

const noFixture = extractScope(cleanup, "if (classification === 'NO_FIXTURE_PRESENT')", 'no_fixture_branch')
assert(noFixture.includes('process.exit(0)'), 'no_fixture_success_exit')
noToken(noFixture, 'deleteExactly(', 'no_fixture_mutation')
noToken(noFixture, 'restoreStock(', 'no_fixture_stock_mutation')

const unknown = extractScope(cleanup, "if (classification === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE')", 'unknown_branch')
assert(unknown.includes("fail('unexpected_or_ambiguous_structure')"), 'unknown_fail_closed')
noToken(unknown, 'deleteExactly(', 'unknown_mutation')
noToken(unknown, 'restoreStock(', 'unknown_stock_mutation')

const preBranch = extractScope(cleanup, "if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY')", 'predelivery_branch')
sequence(preBranch, [
  "deleteExactly(admin, 'request_items'",
  "deleteExactly(admin, 'requests'",
], 'predelivery_sequence')
assert(count(preBranch, 'deleteExactly(') === 2, 'predelivery_cardinality')
assert(preBranch.includes('process.exit(0)'), 'predelivery_terminal_success')
noToken(preBranch, 'catch', 'predelivery_failure_fallback')

const fullStart = at(cleanup, 'await restoreStock(', 'full_branch')
const fullEnd = at(cleanup.slice(fullStart), "console.log('L1_DELIVERY_CLEANUP_V2_SEQUENCE:", 'full_branch_end') + fullStart
const fullBranch = cleanup.slice(fullStart, fullEnd)
sequence(fullBranch, [
  'await restoreStock(',
  "deleteExactly(admin, 'inventory_movements'",
  "deleteExactly(admin, 'loan_items'",
  "deleteExactly(admin, 'loans'",
  "deleteExactly(admin, 'request_items'",
  "deleteExactly(admin, 'requests'",
], 'full_sequence')
assert(count(fullBranch, 'await restoreStock(') === 1, 'full_stock_cardinality')
assert(count(fullBranch, 'deleteExactly(') === 5, 'full_delete_cardinality')
noToken(fullBranch, 'catch', 'full_failure_fallback')

const deleteHelper = functionScope(cleanup, 'async function deleteExactly(', 'delete_helper')
const restoreHelper = functionScope(cleanup, 'async function restoreStock(', 'restore_helper')
const failHelper = functionScope(cleanup, 'function fail(', 'fail_helper')
assert(deleteHelper.includes('for (const [key, value]'), 'delete_predicate_loop')
noToken(deleteHelper, 'deleteExactly(', 'delete_recursive_retry')
noToken(restoreHelper, 'restoreStock(', 'restore_recursive_retry')
assert(failHelper.includes('process.exit(1)'), 'cleanup_failure_exit')
noToken(cleanup, 'setInterval(', 'cleanup_retry_timer')
noToken(cleanup, 'readWithBoundedRetry', 'cleanup_helper_retry')
noToken(cleanup, 'catch', 'cleanup_mutation_catch_fallback')
assert(count(cleanup, 'const classification = classify(') === 1, 'no_reclassification')
for (const forbidden of [
  'cleanup-l1-fixture.mjs',
  'cleanup-l1-delivery-fixture.mjs',
  'cleanup-l1-delivery-fixture-v3.mjs',
  'cleanup-l1-delivery-fixture-v4.mjs',
  'cleanup-l1-delivery-fixture-v5.mjs',
  'cleanup-l1-delivery-fixture-v6.mjs',
  'cleanup-l1-delivery-fixture-v7.mjs',
]) noToken(cleanup, forbidden, 'cleanup_fallback_target')

assert(runner.includes("process.cwd() !== root"), 'e2e_workdir_isolation')
assert(runner.includes("['npx', 'playwright', 'test', actualSpec"), 'e2e_playwright_binding')
assert(runner.includes("'--project=chromium-lab-staff'"), 'e2e_project_binding')
noToken(runner, 'deliverRequestWithState', 'production_action_reference')
noToken(runner, 'deliver_approved_request_with_units', 'production_rpc_reference')

console.log('PASS:F3IW_STATIC_CONTRACT')
