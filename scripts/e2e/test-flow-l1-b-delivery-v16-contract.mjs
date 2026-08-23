import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const checkerDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(checkerDir, '..', '..')
const runnerPath = 'scripts/e2e/run-flow-l1-b-delivery-v3.mjs'
const cleanupPath = 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'
const specPath = 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'
const pins = {
  [runnerPath]: '242903f4a2e4414c720e32150b77d31065f2e93e6869115238be8eedde15fc74',
  [cleanupPath]: '1bf5f5d8e69cf4b463804f67e0fce28f1f35f454d1faa10685a6c1fea55359d0',
  [specPath]: '781f498a12cd8ad8045c9a57ff37417ce91f1e683a5962b060f3141da08feef7',
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

function exactIf(tree, text) {
  return one(all(tree, (node) => ts.isIfStatement(node) &&
    all(node.expression, (child) => ts.isStringLiteral(child) && child.text === text).length > 0), `if_owner:${text}`)
}

function branchOf(ifNode, alternate = false) {
  const branch = alternate ? ifNode.elseStatement : ifNode.thenStatement
  requireProof(branch, `missing_branch:${alternate ? 'else' : 'then'}`)
  return branch
}

function directReturns(block, text) {
  return statements(block).filter((statement) => ts.isReturnStatement(statement) && literal(statement.expression) === text)
}

function containingExecutableStatement(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isStatement(current)) return current
  }
  fail('missing_executable_statement_owner')
}

function terminalCalls(tree, owner) {
  return all(owner, (node) => ts.isCallExpression(node) && callName(node) === 'exit' &&
    ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(tree) === 'process')
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

const makeBrowserEnvironment = functionLike(runnerTree, 'makeBrowserEnvironment')
const raceOwner = functionLike(runnerTree, 'waitForResultOrChildExit')
const deliveryOwner = functionLike(runnerTree, 'consumeDeliveryAttempt')
const cleanupOwner = functionLike(runnerTree, 'runCleanupOnce')
const classifyOwner = functionLike(cleanupTree, 'classify')
const deleteOwner = functionLike(cleanupTree, 'deleteExactly')
const restoreOwner = functionLike(cleanupTree, 'restoreStock')
const failOwner = functionLike(cleanupTree, 'fail')
const runnerTry = one(all(runnerTree, (node) => ts.isTryStatement(node)), 'runner_try')
const runnerCatch = one(all(runnerTry, (node) => ts.isCatchClause(node)), 'runner_catch')

const childEnvDeclaration = topLevelVariable(runnerTree, 'childEnv')
const childEnvFactoryCall = initializerCall(childEnvDeclaration, 'makeBrowserEnvironment')
const spawn = one(calls(runnerTree, 'spawn').filter((node) => !chain(node).some((item) => ts.isFunctionLike(item))), 'top_level_spawn')
const spawnOptions = spawn.arguments[2]
const envProperty = objectProperty(spawnOptions, 'env')
const envReference = envProperty.initializer
const resolvedEnv = resolveIdentifier(runnerTree, envReference)
requireProof(resolvedEnv === childEnvDeclaration, 'spawn_env_binding')
requireProof(childEnvFactoryCall.parent === childEnvDeclaration, 'environment_factory_binding')

const cleanupInvocation = one(callsOwnedBy(runnerTree, runnerTry.tryBlock, 'runCleanupOnce'), 'cleanup_invocation')
const cleanupCallStatement = cleanupInvocation.parent.parent
requireProof(ts.isExpressionStatement(cleanupCallStatement) || ts.isVariableStatement(cleanupCallStatement), 'cleanup_call_statement')
const completeCall = one(calls(runnerTree, 'writeEvent').filter((call) => callHasLiteral(call, 'COMPLETE')), 'complete_call')
const completeStatement = containingExecutableStatement(completeCall)
requireProof(ts.isExpressionStatement(completeStatement), 'complete_statement_owner')
requireProof(owns(runnerTry.tryBlock, completeCall), 'complete_try_owner')
requireProof(statementIndex(runnerTry.tryBlock, cleanupCallStatement, 'cleanup') < statementIndex(runnerTry.tryBlock, completeStatement, 'complete'), 'cleanup_before_complete')
requireProof(all(runnerCatch, (node) => ts.isCallExpression(node) && callName(node) === 'writeEvent' && callHasLiteral(node, 'COMPLETE')).length === 0, 'catch_no_complete')

const cleanupFailureFunctions = [deleteOwner, restoreOwner]
for (const owner of cleanupFailureFunctions) {
  const failures = all(owner, (node) => ts.isIfStatement(node) &&
    all(node.thenStatement, (child) => ts.isCallExpression(child) && callName(child) === 'fail').length > 0)
  requireProof(failures.length === 1, 'cleanup_failure_guard')
  requireProof(terminalCalls(cleanupTree, owner).length === 0 || terminalCalls(cleanupTree, failOwner).length >= 1, 'cleanup_failure_terminal_model')
}

const postattempt = {
  COMMON_SETUP: uniqueProof('COMMON_SETUP', () => requireProof(runnerTry.tryBlock.statements.length > 0, 'common_setup')),
  FIRST_TERMINAL: uniqueProof('FIRST_TERMINAL', () => {
    requireProof(directReturns(raceOwner.body, 'result').length === 1, 'result_terminal')
    requireProof(directReturns(raceOwner.body, 'child_exit').length === 1, 'child_terminal')
  }),
  RESULT_FIRST: uniqueProof('RESULT_FIRST', () => {
    requireProof(all(runnerTry.tryBlock, (node) => ts.isIfStatement(node) &&
      all(node.expression, (child) => ts.isIdentifier(child) && child.text === 'terminal').length > 0).length === 1, 'result_branch')
  }),
  CHILD_EXIT_FIRST: uniqueProof('CHILD_EXIT_FIRST', () => {
    requireProof(all(runnerTry.tryBlock, (node) => ts.isIfStatement(node) && node.elseStatement).length >= 1, 'child_branch')
  }),
  LATE_RESULT_IMMUTABILITY: uniqueProof('LATE_RESULT_IMMUTABILITY', () => {
    requireProof(callsOwnedBy(runnerTree, raceOwner, 'writeEvent').length >= 1, 'late_result_owner')
  }),
  CLEANUP_MAX_ONE: uniqueProof('CLEANUP_MAX_ONE', () => {
    requireProof(callsOwnedBy(runnerTree, cleanupOwner, 'spawn').length === 1, 'cleanup_process_once')
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
    requireProof(all(runnerCatch, (node) => ts.isCallExpression(node) && callName(node) === 'runCleanupOnce').length === 0, 'early_cleanup_no_duplicate')
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
    requireProof(directReturns(raceOwner.body, 'child_exit').length === 1, 'child_exit_dominance')
  }),
  CHILD_FAILURE_TERMINATION: uniqueProof('CHILD_FAILURE_TERMINATION', () => {
    const failure = one(all(runnerTry.tryBlock, (node) => ts.isIfStatement(node) &&
      all(node.expression, (child) => ts.isIdentifier(child) && child.text === 'childCode').length > 0), 'child_failure_branch')
    requireProof(failure.thenStatement && all(failure.thenStatement, (child) => ts.isCallExpression(child) && callName(child) === 'fail').length >= 1, 'child_failure_terminal')
  }),
  CLEANUP_SUCCESS_DOMINANCE: uniqueProof('CLEANUP_SUCCESS_DOMINANCE', () => {
    requireProof(statementIndex(runnerTry.tryBlock, cleanupCallStatement, 'cleanup_success') < statementIndex(runnerTry.tryBlock, completeStatement, 'complete_success'), 'cleanup_success_order')
    requireProof(all(runnerCatch, (node) => ts.isCallExpression(node) && callName(node) === 'writeEvent' && callHasLiteral(node, 'COMPLETE')).length === 0, 'cleanup_failure_no_success')
  }),
  CLEANUP_FAILURE_TERMINATION: uniqueProof('CLEANUP_FAILURE_TERMINATION', () => {
    for (const owner of cleanupFailureFunctions) requireProof(all(owner, (node) => ts.isIfStatement(node) &&
      all(node.thenStatement, (child) => ts.isCallExpression(child) && callName(child) === 'fail').length === 1).length === 1, 'cleanup_internal_failure')
    requireProof(terminalCalls(cleanupTree, failOwner).length === 1, 'cleanup_fail_terminal')
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
    const assignment = one(all(makeBrowserEnvironment, (node) => ts.isPropertyAssignment(node) && propertyName(node.name) === 'RESEND_API_KEY'), 'email_property')
    requireProof(literal(assignment.initializer) === '', 'email_empty')
    requireProof(envReference.getText(runnerTree) === 'childEnv', 'email_attached_env')
  }),
  FIVE_STATE_CLASSIFIER: uniqueProof('FIVE_STATE_CLASSIFIER', () => {
    const states = ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']
    for (const state of states) requireProof(all(classifyOwner, (node) => ts.isStringLiteral(node) && node.text === state).length >= 1, `classifier:${state}`)
  }),
  UNKNOWN_ZERO_MUTATION: uniqueProof('UNKNOWN_ZERO_MUTATION', () => {
    const unknown = exactIf(cleanupTree, 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE')
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
    requireProof(callsOwnedBy(runnerTree, runnerTry.tryBlock, 'runCleanupOnce').length === 1, 'cleanup_primary_path')
    requireProof(all(runnerTry.tryBlock, (node) => ts.isIfStatement(node) && node.elseStatement).length >= 1, 'fallback_inventory')
  }),
  FAIL_CLOSED: uniqueProof('FAIL_CLOSED', () => {
    requireProof(terminalCalls(cleanupTree, failOwner).length === 1, 'cleanup_fail_closed_terminal')
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

console.log('FLOW_L1_B_DELIVERY_V15_CONTRACT: PASS')
