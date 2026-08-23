import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('../..', import.meta.url).pathname)
const runnerPath = 'scripts/e2e/run-flow-l1-b-delivery-v3.mjs'
const specPath = 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'
const cleanupPath = 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'

const pins = {
  [runnerPath]: '242903f4a2e4414c720e32150b77d31065f2e93e6869115238be8eedde15fc74',
  [specPath]: '781f498a12cd8ad8045c9a57ff37417ce91f1e683a5962b060f3141da08feef7',
  [cleanupPath]: '1bf5f5d8e69cf4b463804f67e0fce28f1f35f454d1faa10685a6c1fea55359d0',
}

function fail(message) {
  console.error(`FAIL:${message}`)
  process.exitCode = 1
  throw new Error(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  assert(absolute.startsWith(`${root}${path.sep}`), `path_outside_project:${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function assertPinned(relativePath, source) {
  assert(sha256(source) === pins[relativePath], `hash_mismatch:${relativePath}`)
}

function matchingBrace(source, openIndex) {
  assert(source[openIndex] === '{', `expected_open_brace:${openIndex}`)
  let depth = 0
  let quote = null
  let lineComment = false
  let blockComment = false
  let escaped = false

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
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === quote) {
        quote = null
      }
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
  fail('unbalanced_braces')
}

function extractBlockAfter(source, marker, label = marker) {
  const markerIndex = source.indexOf(marker)
  assert(markerIndex >= 0, `missing_scope_marker:${label}`)
  const openIndex = source.indexOf('{', markerIndex + marker.length)
  assert(openIndex >= 0, `missing_scope_open:${label}`)
  const closeIndex = matchingBrace(source, openIndex)
  return source.slice(openIndex, closeIndex + 1)
}

function extractFunction(source, signature, label = signature) {
  return extractBlockAfter(source, signature, label)
}

function count(source, token) {
  return source.split(token).length - 1
}

function requireSequence(source, tokens, label) {
  let cursor = -1
  for (const token of tokens) {
    const next = source.indexOf(token, cursor + 1)
    assert(next >= 0, `${label}:missing:${token}`)
    cursor = next
  }
}

function position(source, token, label) {
  const value = source.indexOf(token)
  assert(value >= 0, `${label}:missing:${token}`)
  return value
}

function assertNo(source, tokens, label) {
  for (const token of tokens) assert(!source.includes(token), `${label}:forbidden:${token}`)
}

const runner = read(runnerPath)
const spec = read(specPath)
const cleanup = read(cleanupPath)
assertPinned(runnerPath, runner)
assertPinned(specPath, spec)
assertPinned(cleanupPath, cleanup)

assert(runner.includes(`const actualSpec = '${specPath}'`), 'runner_spec_binding')
assert(runner.includes(`const cleanupPath = '${cleanupPath}'`), 'runner_cleanup_binding')
assertNo(runner, [
  'cleanup-l1-fixture.mjs',
  'cleanup-l1-delivery-fixture.mjs',
  'cleanup-l1-delivery-fixture-v3.mjs',
  'cleanup-l1-delivery-fixture-v4.mjs',
  'cleanup-l1-delivery-fixture-v5.mjs',
  'cleanup-l1-delivery-fixture-v6.mjs',
], 'runner_cleanup_target')

const environmentFunction = extractFunction(runner, 'function makeBrowserEnvironment()', 'browser_environment')
assert(environmentFunction.includes("RESEND_API_KEY: ''"), 'child_env_empty_resend_key')
assert(!environmentFunction.includes('delete '), 'child_env_unset_strategy')
assert(runner.includes('env: childEnv'), 'child_env_passed_to_spawn')
assert(runner.includes('EMAIL_PROVIDER_MAX_SUBMISSIONS'), 'email_submission_cap')

const transportScope = extractBlockAfter(runner, 'fs.rmSync(eventPath, { force: true })', 'transport_initialization')
assert(!transportScope.includes("writeEvent('BROWSER_READY')"), 'runner_browser_ready_owner')
assert(!runner.includes("writeEvent('BROWSER_READY')"), 'runner_emits_browser_ready')
assert(count(spec, "emit('BROWSER_READY')") + count(spec, 'BROWSER_READY') > 0, 'spec_browser_ready')
assert(runner.includes("waitForHandshake('BROWSER_READY')"), 'runner_waits_browser_ready')

const raceScope = extractFunction(runner, 'async function waitForResultOrChildExit()', 'result_or_exit_race')
assert(raceScope.includes("state === 'DELIVERY_RESULT_OBSERVED'"), 'race_result_candidate')
assert(raceScope.includes("child.exitCode !== null"), 'race_child_exit_candidate')
assert(raceScope.includes("return 'result'"), 'race_result_settlement')
assert(raceScope.includes("return 'child_exit'"), 'race_child_exit_settlement')
assert(raceScope.includes('while ('), 'race_bounded_polling_loop')
assert(runner.includes('const terminal = await waitForResultOrChildExit()'), 'race_consumed_once')
const lifecycle = extractBlockAfter(runner, 'try {\n  await waitForHandshake', 'normal_lifecycle')
requireSequence(lifecycle, [
  "const terminal = await waitForResultOrChildExit()",
  "if (terminal === 'result')",
  "writeEvent('CLEANUP_REQUIRED')",
  'const childCode = await waitForChild()',
  'await runCleanupOnce()',
], 'postattempt_lifecycle')
assert(lifecycle.includes('writeCleanupAuditEvent()'), 'child_exit_first_audit')
assert(!lifecycle.includes("writeEvent('CLEANUP_REQUIRED')\n  const childCode"), 'early_cleanup_while_pending')
assert(count(lifecycle, 'await runCleanupOnce()') === 1, 'normal_cleanup_once')

const deliveryGuard = extractFunction(runner, 'function consumeDeliveryAttempt()', 'delivery_attempt_guard')
requireSequence(deliveryGuard, ['deliveryAttempt !== 0', 'deliveryAttempt: 1'], 'delivery_attempt_transition')
const authorization = position(lifecycle, 'consumeDeliveryAttempt()', 'delivery_attempt_call')
const authorizationEvent = position(lifecycle, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')", 'authorization_event')
assert(authorization < authorizationEvent, 'delivery_attempt_before_authorization')
assert(count(lifecycle, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')") === 1, 'authorization_once')
assert(!lifecycle.includes('deliveryAttempt: 0'), 'delivery_attempt_not_reset')
assert(!runner.includes('deliveryAttempt: 0'), 'delivery_attempt_global_reset')

const cleanupOnce = extractFunction(runner, 'async function runCleanupOnce()', 'cleanup_once_function')
assert(cleanupOnce.includes('cleanupAttempted'), 'cleanup_once_guard')
assert(cleanupOnce.includes('execFileSync'), 'cleanup_process_launch')
assert(cleanupOnce.includes('clearRecoveryState()'), 'cleanup_success_commit')
assert(count(runner, 'execFileSync(') === 1, 'cleanup_process_max_one')
assert(!runner.includes('cleanupPathV3'), 'cleanup_v3_absent')

const completeSites = count(runner, "writeEvent('COMPLETE')")
assert(completeSites === 1, 'complete_site_count')
const completeAt = position(lifecycle, "writeEvent('COMPLETE')", 'complete_site')
const childExitAt = position(lifecycle, 'const childCode = await waitForChild()', 'child_exit_observation')
const childFailureAt = position(lifecycle, "if (childCode !== 0) fail('delivery_browser_failed_after_cleanup')", 'child_failure_guard')
const cleanupAt = position(lifecycle, 'await runCleanupOnce()', 'cleanup_call')
assert(childExitAt < cleanupAt && cleanupAt < childFailureAt && childFailureAt < completeAt, 'complete_success_dominance')
assert(extractBlockAfter(runner, '} catch (error) {', 'error_handler').includes("writeEvent('COMPLETE')") === false, 'error_handler_complete_rejection')
assert(completeAt > childFailureAt, 'child_exit_dominates_complete')
assert(cleanupOnce.indexOf('execFileSync') < cleanupOnce.indexOf('clearRecoveryState()'), 'cleanup_success_dominates')

const states = [
  'NO_FIXTURE_PRESENT',
  'PENDING_PREDELIVERY',
  'APPROVED_PREDELIVERY',
  'FULLY_DELIVERED_MINIMAL_BULK',
  'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE',
]
for (const state of states) assert(count(cleanup, state) > 0, `cleanup_state:${state}`)
const classifier = extractFunction(cleanup, 'function classify(', 'cleanup_classifier')
const cleanupDispatch = extractBlockAfter(cleanup, "if (classification === 'NO_FIXTURE_PRESENT')", 'cleanup_dispatch')
const firstMutation = Math.min(...[
  cleanup.indexOf('deleteExactly('),
  cleanup.indexOf('restoreStock('),
].filter((value) => value >= 0))
assert(cleanup.indexOf('const classification = classify(') >= 0, 'classification_present')
assert(cleanup.indexOf('const classification = classify(') < firstMutation, 'classification_before_mutation')
assert(count(cleanup, 'const classification = classify(') === 1, 'single_classification')
assert(cleanupDispatch.includes("process.exit(0)"), 'no_fixture_terminal')
assert(cleanupDispatch.includes("fail('unexpected_or_ambiguous_structure')"), 'unknown_fail_closed')
assert(!cleanupDispatch.includes('classify('), 'no_second_classification')

const preBranch = extractBlockAfter(cleanup, "if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY')", 'predelivery_branch')
requireSequence(preBranch, [
  "deleteExactly(admin, 'request_items'",
  "deleteExactly(admin, 'requests'",
], 'predelivery_cardinality')
assert(count(preBranch, 'deleteExactly(') === 2, 'predelivery_two_mutations')
assert(!preBranch.includes('for ('), 'predelivery_no_retry_loop')

const fullStart = cleanup.indexOf('await restoreStock(')
assert(fullStart >= 0, 'full_branch_start')
const fullBranch = cleanup.slice(fullStart, cleanup.indexOf("console.log('cleanup complete')", fullStart))
requireSequence(fullBranch, [
  'await restoreStock(',
  "deleteExactly(admin, 'inventory_movements'",
  "deleteExactly(admin, 'loan_items'",
  "deleteExactly(admin, 'loans'",
  "deleteExactly(admin, 'request_items'",
  "deleteExactly(admin, 'requests'",
], 'full_cardinality')
assert(count(fullBranch, 'deleteExactly(') === 5, 'full_five_deletes')
assert(count(fullBranch, 'await restoreStock(') === 1, 'full_one_stock_mutation')
assert(!fullBranch.includes('catch'), 'full_failure_no_fallback')

const deleteHelper = extractFunction(cleanup, 'async function deleteExactly(', 'delete_helper')
const restoreHelper = extractFunction(cleanup, 'async function restoreStock(', 'restore_helper')
const failHelper = extractFunction(cleanup, 'function fail(', 'cleanup_fail_helper')
assert(failHelper.includes('process.exit(1)'), 'cleanup_fail_closed_exit')
assert(!deleteHelper.includes('deleteExactly('), 'delete_helper_no_recursion')
assert(!restoreHelper.includes('restoreStock('), 'restore_helper_no_recursion')
assert(!cleanup.includes('setInterval('), 'cleanup_no_retry_timer')
assert(!cleanup.includes('readWithBoundedRetry'), 'cleanup_no_helper_retry')
assert(!cleanup.match(/catch[\s\S]{0,500}deleteExactly\(/), 'cleanup_no_catch_retry')
assertNo(cleanup, [
  'cleanup-l1-fixture.mjs',
  'cleanup-l1-delivery-fixture.mjs',
  'cleanup-l1-delivery-fixture-v3.mjs',
  'cleanup-l1-delivery-fixture-v4.mjs',
  'cleanup-l1-delivery-fixture-v5.mjs',
  'cleanup-l1-delivery-fixture-v6.mjs',
], 'cleanup_fallback_target')
assert(classifier.includes('return UNKNOWN_OR_AMBIGUOUS'), 'classifier_unknown')
assert(cleanupDispatch.includes("process.exit(0)"), 'branch_success_terminal')

assert(cleanup.includes('returns'), 'forbidden_returns')
assert(cleanup.includes('loan_groups'), 'forbidden_group_loan')
assert(cleanup.includes('units'), 'forbidden_units')
assert(cleanup.includes('unexpected request status') || cleanup.includes('unexpected_request_status'), 'forbidden_request_status')
assert(runner.includes('.env.e2e'), 'e2e_environment_binding')
assert(!runner.includes('deliverRequestWithState'), 'production_action_unchanged')
assert(!runner.includes('deliver_approved_request_with_units'), 'production_rpc_unchanged')

const unsafeTokens = [
  'node:child_process', 'child_process', 'spawn(', 'execFile(', 'execFileSync(',
  'eval(', 'Function(', 'node:vm', 'vm.', 'fetch(', 'http.', 'https.', 'net.', 'tls.', 'dns.',
  'writeFile', 'appendFile', 'rename(', 'unlink(', 'rmSync(', 'process.env =',
]
assertNo(read(path.basename(new URL(import.meta.url).pathname)), unsafeTokens, 'checker_execution_safety')

console.log('PASS:F3IU_STATIC_CONTRACT')
