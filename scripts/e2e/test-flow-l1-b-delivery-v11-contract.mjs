import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const checkerDir = path.dirname(fileURLToPath(import.meta.url))
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

function lexical(source) {
  const delimiters = []
  const structural = []
  let mode = 'code'
  let escaped = false
  let templateInterpolation = 0
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    const next = source[i + 1]
    if (mode === 'line_comment') {
      if (ch === '\n') mode = 'code'
      continue
    }
    if (mode === 'block_comment') {
      if (ch === '*' && next === '/') {
        mode = 'code'
        i += 1
      }
      continue
    }
    if (mode === 'single' || mode === 'double') {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if ((mode === 'single' && ch === "'") || (mode === 'double' && ch === '"')) mode = 'code'
      continue
    }
    if (mode === 'template') {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '`') mode = 'code'
      else if (ch === '$' && next === '{') {
        structural.push({ ch: '${', index: i })
        delimiters.push({ ch: '}', kind: 'template_interpolation' })
        templateInterpolation += 1
        mode = 'code'
        i += 1
      }
      continue
    }
    if (ch === '/' && next === '/') {
      mode = 'line_comment'
      i += 1
      continue
    }
    if (ch === '/' && next === '*') {
      mode = 'block_comment'
      i += 1
      continue
    }
    if (ch === "'") {
      mode = 'single'
      escaped = false
      continue
    }
    if (ch === '"') {
      mode = 'double'
      escaped = false
      continue
    }
    if (ch === '`') {
      mode = 'template'
      escaped = false
      continue
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      delimiters.push({ ch, kind: 'normal' })
      structural.push({ ch, index: i })
      continue
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      const expected = ch === ')' ? '(' : ch === ']' ? '[' : '{'
      const top = delimiters[delimiters.length - 1]
      assert(top && top.ch === expected, 'lexical_delimiter_mismatch')
      delimiters.pop()
      structural.push({ ch, index: i })
      if (top.kind === 'template_interpolation' && ch === '}') {
        templateInterpolation -= 1
        mode = 'template'
      }
    }
  }
  assert(mode === 'code' && delimiters.length === 0 && templateInterpolation === 0, 'lexical_state_unclosed')
  return structural
}

function uniqueMarker(source, marker, label) {
  const first = source.indexOf(marker)
  assert(first >= 0, `missing_marker:${label}`)
  assert(first === source.lastIndexOf(marker), `ambiguous_marker:${label}`)
  return first
}

function matchingBrace(source, openAt, label) {
  const structural = lexical(source)
  const open = structural.find((token) => token.index === openAt && token.ch === '{')
  assert(open, `wrong_opening_brace:${label}`)
  let depth = 0
  for (const token of structural.filter((item) => item.index >= openAt)) {
    if (token.ch === '{') depth += 1
    if (token.ch === '}') {
      depth -= 1
      if (depth === 0) return token.index
    }
  }
  fail(`unbalanced_scope:${label}`)
}

function bodyFromOpening(source, openAt, kind, label) {
  const closeAt = matchingBrace(source, openAt, label)
  return { kind, headerIncluded: false, delimitersIncluded: true, bodyIncluded: true, text: source.slice(openAt, closeAt + 1) }
}

function extractFunctionBody(source, marker, label) {
  const markerAt = uniqueMarker(source, marker, label)
  const structural = lexical(source)
  const openParenAt = markerAt + marker.length - 1
  const openParen = structural.find((token) => token.index === openParenAt && token.ch === '(')
  assert(openParen, `missing_function_header:${label}`)
  let depth = 0
  let closeParen = null
  for (const token of structural.filter((item) => item.index >= openParen.index)) {
    if (token.ch === '(') depth += 1
    if (token.ch === ')') {
      depth -= 1
      if (depth === 0) {
        closeParen = token
        break
      }
    }
  }
  assert(closeParen, `unbalanced_function_header:${label}`)
  const open = structural.find((token) => token.index > closeParen.index && token.ch === '{')
  assert(open, `missing_function_body:${label}`)
  return bodyFromOpening(source, open.index, 'FUNCTION_BODY', label)
}

function extractTryBody(source, marker, label) {
  const markerAt = uniqueMarker(source, marker, label)
  const openAt = markerAt + marker.lastIndexOf('{')
  assert(source[openAt] === '{', `try_anchor:${label}`)
  return bodyFromOpening(source, openAt, 'TRY_BODY', label)
}

function extractCatchBody(source, marker, label) {
  const markerAt = uniqueMarker(source, marker, label)
  const openAt = markerAt + marker.lastIndexOf('{')
  assert(source[openAt] === '{', `catch_anchor:${label}`)
  return bodyFromOpening(source, openAt, 'CATCH_BODY', label)
}

function extractIfBody(source, marker, label) {
  const markerAt = uniqueMarker(source, marker, label)
  const structural = lexical(source)
  const markerEnd = markerAt + marker.length
  const open = structural.find((token) => token.index >= markerEnd && token.ch === '{')
  assert(open, `missing_branch_body:${label}`)
  return bodyFromOpening(source, open.index, 'IF_BRANCH_BODY', label)
}

function extractStatement(source, marker, label) {
  uniqueMarker(source, marker, label)
  return { kind: 'STATEMENT', headerIncluded: true, delimitersIncluded: false, bodyIncluded: true, text: marker }
}

function extractTopLevelRegion(source, startMarker, endMarker, label) {
  const start = uniqueMarker(source, startMarker, `${label}_start`)
  const end = uniqueMarker(source, endMarker, `${label}_end`)
  assert(start < end, `region_order:${label}`)
  const structural = lexical(source)
  const depthAt = (offset) => {
    let depth = 0
    for (const token of structural) {
      if (token.index >= offset) break
      if (token.ch === '(' || token.ch === '[' || token.ch === '{') depth += 1
      if (token.ch === ')' || token.ch === ']' || token.ch === '}') depth -= 1
    }
    return depth
  }
  assert(depthAt(start) === 0 && depthAt(end) === 0, `non_top_level_region:${label}`)
  return { kind: 'TOP_LEVEL_MUTATION_REGION', headerIncluded: true, delimitersIncluded: false, bodyIncluded: true, text: source.slice(start, end) }
}

function count(source, token) {
  return source.split(token).length - 1
}

function position(source, token, label) {
  const result = source.indexOf(token)
  assert(result >= 0, `missing:${label}`)
  return result
}

function forbid(source, token, label) {
  assert(!source.includes(token), `forbidden:${label}:${token}`)
}

function uniqueTextPosition(source, token, label) {
  assert(count(source, token) === 1, `non_unique_structural_token:${label}`)
  return position(source, token, label)
}

function assertPostattemptStructure(lifecycle) {
  const terminalAt = uniqueTextPosition(lifecycle, 'const terminal = await waitForResultOrChildExit()', 'terminal_settlement')
  const resultBranchAt = uniqueTextPosition(lifecycle, "if (terminal === 'result') writeEvent('CLEANUP_REQUIRED')", 'result_first_branch')
  const childAt = uniqueTextPosition(lifecycle, 'const childCode = await waitForChild()', 'child_exit_observation')
  const cleanupAt = uniqueTextPosition(lifecycle, 'await runCleanupOnce()', 'normal_cleanup')
  assert(resultBranchAt > terminalAt && childAt > resultBranchAt && cleanupAt > childAt, 'postattempt_common_order')
  assert(lifecycle.includes('else writeCleanupAuditEvent()'), 'child_exit_first_branch')
  assert(count(lifecycle, 'waitForResultOrChildExit()') === 1, 'settlement_one_shot')
  const postSettlement = lifecycle.slice(childAt)
  forbid(postSettlement, 'DELIVERY_RESULT_OBSERVED', 'late_result_reopen')
  forbid(postSettlement, "writeEvent('CLEANUP_REQUIRED')", 'late_cleanup_required')
  forbid(postSettlement, 'consumeDeliveryAttempt()', 'late_delivery_retry')
  forbid(postSettlement, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')", 'late_authorization')
  assert(count(lifecycle, 'await runCleanupOnce()') === 1, 'normal_cleanup_once_structural')
}

function assertDeliveryTransitionStructure(delivery) {
  const guardAt = uniqueTextPosition(delivery, 'deliveryAttempt !== 0', 'delivery_attempt_guard')
  const transitionAt = uniqueTextPosition(delivery, 'deliveryAttempt: 1', 'delivery_attempt_transition')
  assert(guardAt < transitionAt, 'delivery_transition_order')
  assert(delivery.includes('if (current.deliveryAttempt !== 0) fail('), 'delivery_guard_owner')
  assert(delivery.includes('atomicSnapshot({ ...current, deliveryAttempt: 1 })'), 'delivery_transition_owner')
  forbid(delivery, 'deliveryAttempt: 0', 'delivery_attempt_reset')
}

function assertPredeliveryStructure(preBranch) {
  const itemAt = uniqueTextPosition(preBranch, "await deleteExactly(admin, 'request_items'", 'predelivery_item_delete')
  const requestAt = uniqueTextPosition(preBranch, "await deleteExactly(admin, 'requests'", 'predelivery_request_delete')
  assert(itemAt < requestAt, 'predelivery_mutation_order')
  assert(preBranch.includes("await deleteExactly(admin, 'request_items',"), 'predelivery_item_awaited')
  assert(preBranch.includes("await deleteExactly(admin, 'requests',"), 'predelivery_request_awaited')
  forbid(preBranch, 'catch', 'predelivery_no_fallback')
}

function assertFullCleanupStructure(fullBranch) {
  const operations = [
    ['await restoreStock(', 'restore_stock'],
    ["deleteExactly(admin, 'inventory_movements'", 'delete_inventory_movement'],
    ["deleteExactly(admin, 'loan_items'", 'delete_loan_item'],
    ["deleteExactly(admin, 'loans'", 'delete_loan'],
    ["deleteExactly(admin, 'request_items'", 'delete_request_item'],
    ["deleteExactly(admin, 'requests'", 'delete_request'],
  ]
  let previous = -1
  for (const [token, label] of operations) {
    const current = uniqueTextPosition(fullBranch, token, label)
    assert(current > previous, `full_cleanup_order:${label}`)
    previous = current
  }
  assert(fullBranch.includes('await restoreStock('), 'full_restore_awaited')
  assert(count(fullBranch, 'deleteExactly(') === 5, 'full_cleanup_cardinality')
  forbid(fullBranch, 'catch', 'full_no_fallback')
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
  'cleanup-l1-delivery-fixture-v10.mjs',
]) forbid(runner, oldPath, 'alternate_cleanup')

const environment = extractFunctionBody(runner, 'function makeBrowserEnvironment(', 'child_environment').text
assert(environment.includes("RESEND_API_KEY: ''"), 'empty_resend_key')
assert(runner.includes('env: childEnv'), 'child_environment_binding')
assert(runner.includes('EMAIL_PROVIDER_MAX_SUBMISSIONS: 0'), 'zero_email_cap')
forbid(environment, 'delete ', 'unset_email_key')

const transport = extractStatement(runner, 'fs.rmSync(eventPath, { force: true })', 'transport_reset').text
forbid(transport, "writeEvent('BROWSER_READY')", 'runner_ready_emission')
forbid(runner, "writeEvent('BROWSER_READY')", 'runner_ready_global')
assert(spec.includes("writeSignal('BROWSER_READY')"), 'spec_ready_signal')
assert(spec.includes("writeEvent('BROWSER_READY')"), 'spec_ready_event')
assert(runner.includes("waitForHandshake('BROWSER_READY')"), 'runner_ready_wait')

const race = extractFunctionBody(runner, 'async function waitForResultOrChildExit()', 'result_or_exit').text
assert(race.includes("state === 'DELIVERY_RESULT_OBSERVED'"), 'result_candidate')
assert(race.includes('child.exitCode !== null'), 'child_exit_candidate')
assert(race.includes("return 'result'"), 'result_return')
assert(race.includes("return 'child_exit'"), 'child_exit_return')
assert(race.includes('while ('), 'race_poll')
const lifecycle = extractTryBody(runner, 'try {\n  await waitForHandshake', 'normal_lifecycle').text
const recoveryMarker = '} catch (error) {'
const recovery = extractCatchBody(runner, recoveryMarker, 'error_recovery').text
assert(runner.includes(recoveryMarker), 'parent_catch_exists')
assertPostattemptStructure(lifecycle)
assert(lifecycle.includes('writeCleanupAuditEvent()'), 'child_exit_audit')
assert(count(lifecycle, 'await runCleanupOnce()') === 1, 'normal_cleanup_once')
forbid(lifecycle, "writeEvent('CLEANUP_REQUIRED')\n  const childCode", 'early_cleanup')

const delivery = extractFunctionBody(runner, 'function consumeDeliveryAttempt()', 'delivery_attempt').text
assertDeliveryTransitionStructure(delivery)
const attemptAt = uniqueTextPosition(lifecycle, 'consumeDeliveryAttempt()', 'delivery_call')
const authAt = uniqueTextPosition(lifecycle, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')", 'authorization')
assert(attemptAt < authAt, 'delivery_before_authorization')
assert(count(lifecycle, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')") === 1, 'authorization_once')
forbid(runner, 'deliveryAttempt: 0', 'delivery_reset')

const auditDeclaration = extractFunctionBody(runner, 'function writeCleanupAuditEvent()', 'audit_declaration').text
assert(auditDeclaration.includes('atomicEventWrite'), 'audit_declaration_body')
const normalAuditCalls = count(lifecycle, 'writeCleanupAuditEvent()')
const recoveryAuditCalls = count(recovery, 'writeCleanupAuditEvent()')
assert(normalAuditCalls === 1, 'normal_audit_call_site')
assert(recoveryAuditCalls === 1, 'recovery_audit_call_site')
assert(count(auditDeclaration, 'writeCleanupAuditEvent()') === 0, 'declaration_excluded')
assert(recovery.includes('if (!cleanupAttempted && canRecover())'), 'recovery_audit_guard')
assert(normalAuditCalls + recoveryAuditCalls === 2, 'audit_call_site_count')
assert(recovery.includes('!cleanupAttempted'), 'recovery_scope_behavior')

const cleanupOnce = extractFunctionBody(runner, 'async function runCleanupOnce()', 'cleanup_once').text
assert(cleanupOnce.includes('if (cleanupAttempted) throw'), 'cleanup_once_guard')
assert(cleanupOnce.includes('execFileSync'), 'cleanup_process_launch')
assert(uniqueTextPosition(cleanupOnce, 'execFileSync', 'cleanup_process_launch') < uniqueTextPosition(cleanupOnce, 'clearRecoveryState()', 'cleanup_success'), 'cleanup_success')
assert(count(lifecycle, 'await runCleanupOnce()') === 1, 'normal_cleanup_call')
assert(count(recovery, 'await runCleanupOnce()') === 1, 'recovery_cleanup_call')
assert(recovery.includes('!cleanupAttempted'), 'recovery_cleanup_guard')

const completeAt = uniqueTextPosition(lifecycle, "writeEvent('COMPLETE')", 'complete')
const childExitAt = uniqueTextPosition(lifecycle, 'const childCode = await waitForChild()', 'child_exit')
const cleanupAt = uniqueTextPosition(lifecycle, 'await runCleanupOnce()', 'cleanup')
const childFailureAt = uniqueTextPosition(lifecycle, "if (childCode !== 0) fail('delivery_browser_failed_after_cleanup')", 'child_failure')
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
const classifier = extractFunctionBody(cleanup, 'function classify(', 'classifier').text
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

const noFixture = extractIfBody(cleanup, "if (classification === 'NO_FIXTURE_PRESENT')", 'no_fixture').text
assert(noFixture.includes('process.exit(0)'), 'no_fixture_exit')
forbid(noFixture, 'deleteExactly(', 'no_fixture_mutation')
forbid(noFixture, 'restoreStock(', 'no_fixture_stock')
const unknown = extractIfBody(cleanup, "if (classification === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE')", 'unknown').text
assert(unknown.includes("fail('unexpected_or_ambiguous_structure')"), 'unknown_fail')
forbid(unknown, 'deleteExactly(', 'unknown_mutation')
forbid(unknown, 'restoreStock(', 'unknown_stock')

const preBranch = extractIfBody(cleanup, "if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY')", 'predelivery').text
assertPredeliveryStructure(preBranch)
assert(count(preBranch, 'deleteExactly(') === 2, 'predelivery_count')
assert(preBranch.includes('process.exit(0)'), 'predelivery_exit')
forbid(preBranch, 'catch', 'predelivery_fallback')

const fullBranch = extractTopLevelRegion(cleanup, 'await restoreStock(', "console.log('L1_DELIVERY_CLEANUP_V2_SEQUENCE:", 'full_cleanup').text
assertFullCleanupStructure(fullBranch)
assert(count(fullBranch, 'await restoreStock(') === 1, 'stock_count')
assert(count(fullBranch, 'deleteExactly(') === 5, 'full_delete_count')
forbid(fullBranch, 'catch', 'full_fallback')

const deleteHelper = extractFunctionBody(cleanup, 'async function deleteExactly(', 'delete_helper').text
const restoreHelper = extractFunctionBody(cleanup, 'async function restoreStock(', 'restore_helper').text
const failHelper = extractFunctionBody(cleanup, 'function fail(', 'fail_helper').text
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
  'cleanup-l1-delivery-fixture-v10.mjs',
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

console.log('PASS:F3JE_STATIC_CONTRACT')
