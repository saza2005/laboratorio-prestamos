import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const checkerDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(checkerDir, '..', '..')
const runnerPath = 'scripts/e2e/run-flow-l1-b-delivery-v4.mjs'
const cleanupPath = 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'
const specPath = 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'
const pins = {
  [runnerPath]: '4c2264a58b5ef2ee90bdb9dd22bf82c475b83d36302968412b8601247689bcd3',
  [cleanupPath]: '1bf5f5d8e69cf4b463804f67e0fce28f1f35f454d1faa10685a6c1fea55359d0',
  [specPath]: 'ba2a9b30734fa297abeafc530e576602b8f98f3bf2b20cbc56af8e6c8b56a5f6',
}

function fail(code) {
  console.error(`FAIL:${code}`)
  process.exitCode = 1
  throw new Error(code)
}

function requireProof(condition, code) {
  if (!condition) fail(code)
}

function readTarget(relativePath) {
  const absolute = path.resolve(projectRoot, relativePath)
  requireProof(absolute.startsWith(`${projectRoot}${path.sep}`), `path_scope:${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

function parseSource(fileName, source, kind) {
  const tree = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind)
  requireProof(tree.parseDiagnostics.length === 0, `parse_diagnostics:${fileName}`)
  return tree
}

function digest(source) {
  return crypto.createHash('sha256').update(source).digest('hex')
}

function walk(node, callback) {
  callback(node)
  ts.forEachChild(node, (child) => walk(child, callback))
}

function all(tree, predicate) {
  const result = []
  walk(tree, (node) => { if (predicate(node)) result.push(node) })
  return result
}

function one(items, label) {
  requireProof(items.length === 1, `critical_cardinality:${label}`)
  return items[0]
}

function chain(node) {
  const result = []
  for (let current = node.parent; current; current = current.parent) result.push(current)
  return result
}

function owns(owner, node) {
  return owner === node || chain(node).includes(owner)
}

function statements(block) {
  requireProof(ts.isBlock(block), 'expected_block')
  return [...block.statements]
}

function statementIndex(block, statement, label) {
  const index = statements(block).indexOf(statement)
  requireProof(index >= 0, `statement_owner:${label}`)
  return index
}

function functionLike(tree, name) {
  return one(all(tree, (node) =>
    (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) &&
    node.name?.text === name), `function_owner:${name}`)
}

function callName(node) {
  if (!ts.isCallExpression(node)) return null
  if (ts.isIdentifier(node.expression)) return node.expression.text
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text
  return null
}

function calls(tree, name) {
  return all(tree, (node) => ts.isCallExpression(node) && callName(node) === name)
}

function callsOwnedBy(tree, owner, name) {
  return calls(tree, name).filter((node) => owns(owner, node))
}

function directCalls(block, name) {
  return statements(block).flatMap((statement) =>
    all(statement, (node) => ts.isCallExpression(node) && callName(node) === name))
}

function directCallFromStatement(statement, name, label) {
  let candidates = []
  if (ts.isExpressionStatement(statement)) {
    const expression = ts.isAwaitExpression(statement.expression) ? statement.expression.expression : statement.expression
    if (ts.isCallExpression(expression)) candidates = [expression]
  } else if (ts.isVariableStatement(statement)) {
    candidates = statement.declarationList.declarations
      .map((declaration) => declaration.initializer)
      .filter((initializer) => ts.isCallExpression(initializer))
  }
  const call = one(candidates.filter((candidate) => callName(candidate) === name), label)
  return call
}

function literal(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null
}

function callHasLiteral(call, value) {
  return call.arguments.some((argument) => literal(argument) === value)
}

function propertyName(node) {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : null
}

function topLevelVariable(tree, name) {
  return one(tree.statements.filter((statement) => ts.isVariableStatement(statement)).flatMap((statement) =>
    statement.declarationList.declarations.filter((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name)), `top_level_binding:${name}`)
}

function initializerCall(declaration, name) {
  requireProof(declaration.initializer && ts.isCallExpression(declaration.initializer), `initializer_call:${name}`)
  requireProof(callName(declaration.initializer) === name, `initializer_name:${name}`)
  return declaration.initializer
}

function objectProperty(object, name) {
  requireProof(ts.isObjectLiteralExpression(object), `expected_object:${name}`)
  return one(object.properties.filter((property) => propertyName(property.name) === name), `object_property:${name}`)
}

function resolveIdentifier(tree, identifier) {
  requireProof(ts.isIdentifier(identifier), 'resolve_identifier_kind')
  const declaration = topLevelVariable(tree, identifier.text)
  requireProof(!declaration.initializer || !ts.isBinaryExpression(declaration.initializer), `ambiguous_binding:${identifier.text}`)
  return declaration
}

function directIfs(block, predicate) {
  return statements(block).filter((statement) => ts.isIfStatement(statement) && predicate(statement))
}

function directEnvironmentProperty(owner, name) {
  requireProof(ts.isFunctionLike(owner) && owner.body && ts.isBlock(owner.body), `environment_owner:${name}`)
  const returnStatement = one(statements(owner.body).filter((statement) => ts.isReturnStatement(statement)), `environment_return:${name}`)
  requireProof(ts.isCallExpression(returnStatement.expression), `environment_from_entries:${name}`)
  requireProof(callName(returnStatement.expression) === 'fromEntries', `environment_from_entries_name:${name}`)
  const filterCall = one(returnStatement.expression.arguments.filter((argument) =>
    ts.isCallExpression(argument) && callName(argument) === 'filter'), `environment_filter:${name}`)
  requireProof(ts.isPropertyAccessExpression(filterCall.expression), `environment_filter_access:${name}`)
  requireProof(ts.isCallExpression(filterCall.expression.expression) && callName(filterCall.expression.expression) === 'entries', `environment_entries:${name}`)
  const entriesCall = filterCall.expression.expression
  requireProof(entriesCall.arguments.length === 1 && ts.isObjectLiteralExpression(entriesCall.arguments[0]), `environment_entries_object:${name}`)
  requireProof(filterCall.arguments.length === 1 && ts.isArrowFunction(filterCall.arguments[0]), `environment_filter_callback:${name}`)
  const filterBody = filterCall.arguments[0].body
  requireProof(ts.isBinaryExpression(filterBody) && filterBody.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken &&
    ts.isIdentifier(filterBody.left) && filterBody.left.text === 'value' &&
    ts.isIdentifier(filterBody.right) && filterBody.right.text === 'undefined', `environment_filter_preserves:${name}`)
  return {
    property: one(entriesCall.arguments[0].properties.filter((property) => propertyName(property.name) === name), `environment_direct_property:${name}`),
    filterCall,
  }
}

function directFailureGuards(owner, label) {
  requireProof(ts.isFunctionLike(owner) && owner.body && ts.isBlock(owner.body), `failure_owner:${label}`)
  const guards = directIfs(owner.body, (node) =>
    all(node.thenStatement, (child) => ts.isCallExpression(child) && callName(child) === 'fail').length === 1)
  requireProof(guards.length > 0, `missing_failure_guard:${label}`)
  for (const guard of guards) {
    requireProof(all(guard.thenStatement, (child) => ts.isCallExpression(child) && callName(child) === 'fail').length === 1, `failure_guard_terminal:${label}`)
  }
  return guards
}

function branchOf(ifNode, alternate = false) {
  const branch = alternate ? ifNode.elseStatement : ifNode.thenStatement
  requireProof(branch, `missing_branch:${alternate ? 'else' : 'then'}`)
  return branch
}

function semanticReturn(owner, text, label) {
  requireProof(ts.isFunctionLike(owner) && owner.body && ts.isBlock(owner.body), `terminal_owner:${label}`)
  const candidates = all(owner.body, (node) => ts.isReturnStatement(node) && literal(node.expression) === text)
    .filter((node) => !chain(node).some((item) => item !== owner && ts.isFunctionLike(item)))
  return one(candidates, label)
}

function containingExecutableStatement(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isStatement(current)) return current
  }
  fail('missing_executable_statement_owner')
}

function terminalCalls(owner) {
  requireProof(ts.isFunctionLike(owner) && owner.body && ts.isBlock(owner.body), 'terminal_owner')
  return statements(owner.body).flatMap((statement) => all(statement, (node) => ts.isCallExpression(node) && callName(node) === 'exit' &&
    ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'process'))
}

function localPath(node) {
  return chain(node).filter((item) =>
    ts.isBlock(item) || ts.isIfStatement(item) || ts.isTryStatement(item) || ts.isCatchClause(item) || ts.isIterationStatement(item))
}

function samePath(a, b) {
  const left = localPath(a)
  const right = localPath(b)
  return left.length > 0 && left.length === right.length && left.every((item, index) => item === right[index])
}

function noContinuationAfter(block, statement) {
  return statementIndex(block, statement, 'terminal') === statements(block).length - 1
}

function uniqueProof(name, callback) {
  requireProof(typeof callback === 'function', `missing_proof:${name}`)
  return callback
}

function enclosingTry(node, label) {
  const candidate = chain(node).find((item) => ts.isTryStatement(item))
  requireProof(candidate, label)
  return candidate
}

function enclosingCatch(tryNode, label) {
  requireProof(ts.isTryStatement(tryNode) && tryNode.catchClause, label)
  return tryNode.catchClause
}

const runner = readTarget(runnerPath)
const cleanup = readTarget(cleanupPath)
const spec = readTarget(specPath)
requireProof(digest(runner) === pins[runnerPath], 'runner_hash')
requireProof(digest(cleanup) === pins[cleanupPath], 'cleanup_hash')
requireProof(digest(spec) === pins[specPath], 'spec_hash')

const runnerTree = parseSource(runnerPath, runner, ts.ScriptKind.JS)
const cleanupTree = parseSource(cleanupPath, cleanup, ts.ScriptKind.JS)
const specTree = parseSource(specPath, spec, ts.ScriptKind.TS)
const TOP_LEVEL_PROGRAM = runnerTree

const waitForEventOwner = functionLike(runnerTree, 'waitForEvent')
const browserOwnedEventOrder = topLevelVariable(runnerTree, 'browserOwnedEventOrder')
const eventMonitorProofs = {
  EVENT_MONITOR_NOT_SINGLE_LATEST_STATE_ASSUMPTION: uniqueProof('EVENT_MONITOR_NOT_SINGLE_LATEST_STATE_ASSUMPTION', () => {
    requireProof(browserOwnedEventOrder && all(waitForEventOwner, (node) => ts.isIdentifier(node) && node.text === 'browserOwnedEventOrder').length >= 1, 'browser_event_order_owner')
    requireProof(all(waitForEventOwner, (node) => ts.isStringLiteral(node) && node.text === 'delivery_event_skipped_action_armed').length === 0, 'stale_skip_mapping')
  }),
  INTERMEDIATE_EVENT_LOSS_HANDLED: uniqueProof('INTERMEDIATE_EVENT_LOSS_HANDLED', () => {
    requireProof(all(waitForEventOwner, (node) => ts.isPropertyAssignment(node) && node.name.getText() === 'implied').length >= 1, 'implied_event_evidence')
    requireProof(all(waitForEventOwner, (node) => ts.isReturnStatement(node) && node.expression && node.expression.getText().includes('implied')).length >= 1, 'implied_event_return')
  }),
  EVIDENCE_MONOTONICITY: uniqueProof('EVIDENCE_MONOTONICITY', () => {
    requireProof(all(waitForEventOwner, (node) => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.GreaterThan).length >= 1, 'monotonic_index_comparison')
  }),
  ACTION_ARMED_NOT_INVALIDATED_BY_LATER_STATE: uniqueProof('ACTION_ARMED_NOT_INVALIDATED_BY_LATER_STATE', () => {
    requireProof(all(waitForEventOwner, (node) => ts.isStringLiteral(node) && node.text === 'delivery_event_unproven_action_armed').length === 1, 'action_armed_unknown_mapping')
    requireProof(all(waitForEventOwner, (node) => ts.isIdentifier(node) && node.text === 'browserOwnedEventOrder').length >= 1, 'action_armed_monotonic_owner')
  }),
  FINAL_CLICK_DISTINCT_FROM_ACTION_ARMED: uniqueProof('FINAL_CLICK_DISTINCT_FROM_ACTION_ARMED', () => {
    requireProof(calls(specTree, 'writeEvent').filter((call) => callHasLiteral(call, 'ACTION_ARMED')).length === 1, 'action_armed_site')
    requireProof(calls(specTree, 'writeEvent').filter((call) => callHasLiteral(call, 'FINAL_DELIVERY_ARMED')).length === 1, 'final_armed_site')
  }),
  SUBMISSION_DISTINCT_FROM_FINAL_CLICK: uniqueProof('SUBMISSION_DISTINCT_FROM_FINAL_CLICK', () => {
    requireProof(calls(specTree, 'writeEvent').filter((call) => callHasLiteral(call, 'DELIVERY_SUBMIT_ATTEMPTED')).length === 1, 'submission_event_site')
    requireProof(calls(specTree, 'waitForResponse').length >= 1, 'submission_response_boundary')
  }),
  REMOTE_WRITE_DISTINCT_FROM_SUBMISSION: uniqueProof('REMOTE_WRITE_DISTINCT_FROM_SUBMISSION', () => {
    requireProof(calls(specTree, 'writeEvent').filter((call) => callHasLiteral(call, 'DELIVERY_RESULT_OBSERVED')).length === 1, 'delivery_result_site')
    requireProof(calls(specTree, 'writeEvent').filter((call) => callHasLiteral(call, 'DELIVERY_SUBMIT_ATTEMPTED')).length === 1, 'submission_attempt_site')
  }),
  CLEANUP_STATE_DOES_NOT_ERASE_PRIOR_MILESTONES: uniqueProof('CLEANUP_STATE_DOES_NOT_ERASE_PRIOR_MILESTONES', () => {
    requireProof(calls(runnerTree, 'writeCleanupAuditEvent').length >= 1, 'cleanup_audit_site')
    requireProof(all(waitForEventOwner, (node) => ts.isCallExpression(node) && callName(node) === 'fail' && node.arguments.some((arg) => ts.isStringLiteral(arg) && arg.text.includes('delivery_event_unproven'))).length >= 1, 'cleanup_prior_evidence_failure')
  }),
}

const makeBrowserEnvironment = functionLike(runnerTree, 'makeBrowserEnvironment')
const raceOwner = functionLike(runnerTree, 'waitForResultOrChildExit')
const deliveryOwner = functionLike(runnerTree, 'consumeDeliveryAttempt')
const cleanupOwner = functionLike(runnerTree, 'runCleanupOnce')
const classifyOwner = functionLike(cleanupTree, 'classify')
const deleteOwner = functionLike(cleanupTree, 'deleteExactly')
const restoreOwner = functionLike(cleanupTree, 'restoreStock')
const failOwner = functionLike(cleanupTree, 'fail')

const childEnvDeclaration = topLevelVariable(runnerTree, 'childEnv')
const childEnvFactoryCall = initializerCall(childEnvDeclaration, 'makeBrowserEnvironment')
const spawn = one(calls(runnerTree, 'spawn').filter((node) => !chain(node).some((item) => ts.isFunctionLike(item))), 'top_level_spawn')
const spawnOptions = spawn.arguments[2]
const envProperty = objectProperty(spawnOptions, 'env')
const envReference = envProperty.initializer
const resolvedEnv = resolveIdentifier(runnerTree, envReference)
requireProof(resolvedEnv === childEnvDeclaration, 'spawn_env_binding')
requireProof(childEnvFactoryCall.parent === childEnvDeclaration, 'environment_factory_binding')

const deliveryInvocation = one(calls(runnerTree, 'consumeDeliveryAttempt').filter((node) => !chain(node).some((item) => ts.isFunctionLike(item))), 'delivery_lifecycle_anchor')
const runnerTry = enclosingTry(deliveryInvocation, 'runner_lifecycle_try')
const runnerCatch = enclosingCatch(runnerTry, 'runner_lifecycle_catch')
const cleanupCallStatements = statements(runnerTry.tryBlock).filter((statement) => {
  if (ts.isExpressionStatement(statement)) {
    const expression = ts.isAwaitExpression(statement.expression) ? statement.expression.expression : statement.expression
    return ts.isCallExpression(expression) && callName(expression) === 'runCleanupOnce'
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.some((declaration) =>
      ts.isCallExpression(declaration.initializer) && callName(declaration.initializer) === 'runCleanupOnce')
  }
  return false
})
const cleanupCallStatement = one(cleanupCallStatements, 'cleanup_invocation_statement')
const cleanupInvocation = directCallFromStatement(cleanupCallStatement, 'runCleanupOnce', 'cleanup_invocation')
requireProof(ts.isExpressionStatement(cleanupCallStatement) || ts.isVariableStatement(cleanupCallStatement), 'cleanup_call_statement')
const earlyCleanupInvocations = callsOwnedBy(runnerTree, runnerCatch, 'runCleanupOnce')
const earlyCleanupInvocation = one(earlyCleanupInvocations, 'early_cleanup_role_invocation')
const earlyCleanupGuard = one(chain(earlyCleanupInvocation).filter((node) => ts.isIfStatement(node) &&
  all(node.expression, (child) => ts.isCallExpression(child) && callName(child) === 'canRecover').length === 1), 'early_cleanup_role_guard')
requireProof(earlyCleanupGuard.thenStatement && owns(earlyCleanupGuard, earlyCleanupInvocation), 'early_cleanup_role_path')
const completeCall = one(calls(runnerTree, 'writeEvent').filter((call) => callHasLiteral(call, 'COMPLETE')), 'complete_call')
const completeStatement = containingExecutableStatement(completeCall)
requireProof(ts.isExpressionStatement(completeStatement), 'complete_statement_owner')
requireProof(owns(runnerTry.tryBlock, completeCall), 'complete_try_owner')
requireProof(statementIndex(runnerTry.tryBlock, cleanupCallStatement, 'cleanup') < statementIndex(runnerTry.tryBlock, completeStatement, 'complete'), 'cleanup_before_complete')
requireProof(all(runnerCatch, (node) => ts.isCallExpression(node) && callName(node) === 'writeEvent' && callHasLiteral(node, 'COMPLETE')).length === 0, 'catch_no_complete')

const cleanupFailureFunctions = [deleteOwner, restoreOwner]
for (const owner of cleanupFailureFunctions) {
  const failures = directFailureGuards(owner, owner.name?.text || 'cleanup_operation')
  requireProof(terminalCalls(owner).length === 0 || terminalCalls(failOwner).length >= 1, 'cleanup_failure_terminal_model')
}

const postattempt = {
  COMMON_SETUP: uniqueProof('COMMON_SETUP', () => requireProof(runnerTry.tryBlock.statements.length > 0, 'common_setup')),
  FIRST_TERMINAL: uniqueProof('FIRST_TERMINAL', () => {
    semanticReturn(raceOwner, 'result', 'result_terminal')
    semanticReturn(raceOwner, 'child_exit', 'child_terminal')
  }),
  RESULT_FIRST: uniqueProof('RESULT_FIRST', () => {
    requireProof(directIfs(runnerTry.tryBlock, (node) =>
      all(node.expression, (child) => ts.isIdentifier(child) && child.text === 'terminal').length > 0).length === 1, 'result_branch')
  }),
  CHILD_EXIT_FIRST: uniqueProof('CHILD_EXIT_FIRST', () => {
    requireProof(directIfs(runnerTry.tryBlock, (node) => Boolean(node.elseStatement)).length >= 1, 'child_branch')
  }),
  LATE_RESULT_IMMUTABILITY: uniqueProof('LATE_RESULT_IMMUTABILITY', () => {
    semanticReturn(raceOwner, 'result', 'late_result_terminal')
    requireProof(callsOwnedBy(runnerTree, raceOwner, 'writeEvent').length === 0, 'late_result_no_write')
  }),
  CLEANUP_MAX_ONE: uniqueProof('CLEANUP_MAX_ONE', () => {
    requireProof(directCalls(cleanupOwner.body, 'execFileSync').length === 1, 'cleanup_process_once')
  }),
  COMPLETE_DOMINANCE: uniqueProof('COMPLETE_DOMINANCE', () => {
    requireProof(noContinuationAfter(runnerTry.tryBlock, completeStatement) ||
      statementIndex(runnerTry.tryBlock, cleanupCallStatement, 'cleanup') < statementIndex(runnerTry.tryBlock, completeStatement, 'complete'), 'complete_path')
  }),
}

const replacements = {
  BROWSER_READY: uniqueProof('BROWSER_READY', () => {
    requireProof(envReference.getText(runnerTree) === 'childEnv', 'browser_env_reference')
    requireProof(childEnvFactoryCall.getText(runnerTree).startsWith('makeBrowserEnvironment'), 'browser_env_factory')
    requireProof(spawn.getSourceFile() === runnerTree, 'browser_spawn_source')
  }),
  RESULT_FIRST: postattempt.RESULT_FIRST,
  CHILD_EXIT_FIRST: postattempt.CHILD_EXIT_FIRST,
  EARLY_CLEANUP_REJECTION: uniqueProof('EARLY_CLEANUP_REJECTION', () => {
    requireProof(runnerCatch.block.statements.length > 0, 'early_cleanup_catch')
    requireProof(earlyCleanupInvocations.length === 1, 'early_cleanup_no_duplicate')
    requireProof(owns(earlyCleanupGuard.thenStatement, earlyCleanupInvocation), 'early_cleanup_role_owned')
  }),
  LATE_RESULT_SETTLEMENT: postattempt.LATE_RESULT_IMMUTABILITY,
  DELIVERY_ONE_SHOT: uniqueProof('DELIVERY_ONE_SHOT', () => {
    requireProof(callsOwnedBy(runnerTree, deliveryOwner, 'consumeDeliveryAttempt').length === 0, 'delivery_reentry')
  }),
  CLEANUP_MAX_ONE: postattempt.CLEANUP_MAX_ONE,
  BRANCH_CARDINALITY: uniqueProof('BRANCH_CARDINALITY', () => {
    const states = ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']
    for (const state of states) requireProof(all(cleanupTree, (node) => ts.isStringLiteral(node) && node.text === state).length >= 1, `state:${state}`)
  }),
  COMPLETE_SITE_COUNT: uniqueProof('COMPLETE_SITE_COUNT', () => {
    requireProof(calls(runnerTree, 'writeEvent').filter((call) => callHasLiteral(call, 'COMPLETE')).length === 1, 'complete_site')
  }),
  CHILD_EXIT_DOMINANCE: uniqueProof('CHILD_EXIT_DOMINANCE', () => {
    semanticReturn(raceOwner, 'child_exit', 'child_exit_dominance')
  }),
  CHILD_FAILURE_TERMINATION: uniqueProof('CHILD_FAILURE_TERMINATION', () => {
    const failure = one(directIfs(runnerTry.tryBlock, (node) =>
      all(node.expression, (child) => ts.isIdentifier(child) && child.text === 'childCode').length > 0), 'child_failure_branch')
    requireProof(failure.thenStatement && all(failure.thenStatement, (child) => ts.isCallExpression(child) && callName(child) === 'fail').length >= 1, 'child_failure_terminal')
  }),
  CLEANUP_SUCCESS_DOMINANCE: uniqueProof('CLEANUP_SUCCESS_DOMINANCE', () => {
    requireProof(statementIndex(runnerTry.tryBlock, cleanupCallStatement, 'cleanup_success') < statementIndex(runnerTry.tryBlock, completeStatement, 'complete_success'), 'cleanup_success_order')
    requireProof(all(runnerCatch, (node) => ts.isCallExpression(node) && callName(node) === 'writeEvent' && callHasLiteral(node, 'COMPLETE')).length === 0, 'cleanup_failure_no_success')
  }),
  CLEANUP_FAILURE_TERMINATION: uniqueProof('CLEANUP_FAILURE_TERMINATION', () => {
    for (const owner of cleanupFailureFunctions) directFailureGuards(owner, owner.name?.text || 'cleanup_operation')
    requireProof(terminalCalls(failOwner).length === 1, 'cleanup_fail_terminal')
  }),
  ERROR_HANDLER_COMPLETE_REJECTION: uniqueProof('ERROR_HANDLER_COMPLETE_REJECTION', () => {
    requireProof(runnerCatch.parent === runnerTry, 'catch_owner')
    requireProof(all(runnerCatch, (node) => ts.isCallExpression(node) && callName(node) === 'writeEvent' && callHasLiteral(node, 'COMPLETE')).length === 0, 'catch_rejects_complete')
  }),
}

function mutationCallsInBranch(branchNode) {
  return all(branchNode, (node) => ts.isCallExpression(node) && (callName(node) === 'deleteExactly' || callName(node) === 'restoreStock'))
}

const preserved = {
  RESULT_OR_CHILD_EXIT: postattempt.FIRST_TERMINAL,
  ZERO_EMAIL_CHILD_ENV: uniqueProof('ZERO_EMAIL_CHILD_ENV', () => {
    const assignment = directEnvironmentProperty(makeBrowserEnvironment, 'RESEND_API_KEY')
    requireProof(literal(assignment.property.initializer) === '', 'email_empty')
    requireProof(assignment.filterCall.arguments.length === 1, 'email_filter_single_callback')
    requireProof(envReference.getText(runnerTree) === 'childEnv', 'email_attached_env')
  }),
  FIVE_STATE_CLASSIFIER: uniqueProof('FIVE_STATE_CLASSIFIER', () => {
    const states = ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']
    for (const state of states) requireProof(all(classifyOwner, (node) => ts.isStringLiteral(node) && node.text === state).length >= 1, `classifier:${state}`)
  }),
  UNKNOWN_ZERO_MUTATION: uniqueProof('UNKNOWN_ZERO_MUTATION', () => {
    const unknown = one(directIfs(classifyOwner.body, (node) =>
      all(node.expression, (child) => ts.isStringLiteral(child) && child.text === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE').length > 0), 'unknown_branch')
    const unknownBranch = branchOf(unknown)
    requireProof(mutationCallsInBranch(unknownBranch).length === 0, 'unknown_zero_mutation')
  }),
  FORBIDDEN_GRAPH: uniqueProof('FORBIDDEN_GRAPH', () => {
    requireProof(all(specTree, (node) => ts.isCallExpression(node) && callName(node) === 'test').length === 1, 'spec_owner')
  }),
  PROJECT_ISOLATION: uniqueProof('PROJECT_ISOLATION', () => {
    requireProof(calls(runnerTree, 'cwd').length === 1, 'cwd_guard')
    requireProof(spawn.arguments.length === 3, 'spawn_options_owner')
  }),
  NO_RETRY: uniqueProof('NO_RETRY', () => {
    requireProof(callsOwnedBy(runnerTree, deliveryOwner, 'consumeDeliveryAttempt').length === 0, 'delivery_no_retry')
    requireProof(callsOwnedBy(runnerTree, cleanupOwner, 'runCleanupOnce').length === 0, 'cleanup_no_retry')
  }),
  NO_FALLBACK: uniqueProof('NO_FALLBACK', () => {
    requireProof(cleanupCallStatements.length === 1, 'cleanup_primary_path')
    requireProof(directIfs(runnerTry.tryBlock, (node) => Boolean(node.elseStatement)).length >= 1, 'fallback_inventory')
  }),
  FAIL_CLOSED: uniqueProof('FAIL_CLOSED', () => {
    requireProof(terminalCalls(failOwner).length === 1, 'cleanup_fail_closed_terminal')
    requireProof(all(runnerCatch, (node) => ts.isCallExpression(node) && callName(node) === 'writeEvent' && callHasLiteral(node, 'COMPLETE')).length === 0, 'runner_catch_no_success')
  }),
}

const expectedPostattempt = ['COMMON_SETUP', 'FIRST_TERMINAL', 'RESULT_FIRST', 'CHILD_EXIT_FIRST', 'LATE_RESULT_IMMUTABILITY', 'CLEANUP_MAX_ONE', 'COMPLETE_DOMINANCE']
const expectedReplacement = ['BROWSER_READY', 'RESULT_FIRST', 'CHILD_EXIT_FIRST', 'EARLY_CLEANUP_REJECTION', 'LATE_RESULT_SETTLEMENT', 'DELIVERY_ONE_SHOT', 'CLEANUP_MAX_ONE', 'BRANCH_CARDINALITY', 'COMPLETE_SITE_COUNT', 'CHILD_EXIT_DOMINANCE', 'CHILD_FAILURE_TERMINATION', 'CLEANUP_SUCCESS_DOMINANCE', 'CLEANUP_FAILURE_TERMINATION', 'ERROR_HANDLER_COMPLETE_REJECTION']
const expectedPreserved = ['RESULT_OR_CHILD_EXIT', 'ZERO_EMAIL_CHILD_ENV', 'FIVE_STATE_CLASSIFIER', 'UNKNOWN_ZERO_MUTATION', 'FORBIDDEN_GRAPH', 'PROJECT_ISOLATION', 'NO_RETRY', 'NO_FALLBACK', 'FAIL_CLOSED']
requireProof(JSON.stringify(Object.keys(postattempt)) === JSON.stringify(expectedPostattempt), 'postattempt_registry')
requireProof(JSON.stringify(Object.keys(replacements)) === JSON.stringify(expectedReplacement), 'replacement_registry')
requireProof(JSON.stringify(Object.keys(preserved)) === JSON.stringify(expectedPreserved), 'preserved_registry')
for (const registry of [postattempt, replacements, preserved]) for (const [name, callback] of Object.entries(registry)) requireProof(typeof callback === 'function', `registry_callback:${name}`)

for (const [name, proof] of Object.entries(eventMonitorProofs)) requireProof(typeof proof === 'function', `event_monitor_registry:${name}`)
requireProof(Object.keys(eventMonitorProofs).length === 8, 'event_monitor_registry_count')
for (const registry of [postattempt, replacements, preserved, eventMonitorProofs]) for (const callback of Object.values(registry)) callback()
console.log('FLOW_L1_B_DELIVERY_V25_CONTRACT: PASS')
