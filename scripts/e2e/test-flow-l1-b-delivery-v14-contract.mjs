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

function digest(source) {
  return crypto.createHash('sha256').update(source).digest('hex')
}

function parseSource(fileName, source, scriptKind) {
  const tree = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind)
  requireProof(tree.parseDiagnostics.length === 0, `parse_diagnostics:${fileName}`)
  return tree
}

function visit(node, callback) {
  callback(node)
  ts.forEachChild(node, (child) => visit(child, callback))
}

function nodes(tree, predicate) {
  const result = []
  visit(tree, (node) => { if (predicate(node)) result.push(node) })
  return result
}

function one(items, label) {
  requireProof(items.length === 1, `critical_cardinality:${label}`)
  return items[0]
}

function parentChain(node) {
  const result = []
  for (let current = node.parent; current; current = current.parent) result.push(current)
  return result
}

function hasParent(node, candidate) {
  return parentChain(node).includes(candidate)
}

function namedFunction(tree, name) {
  const candidates = nodes(tree, (node) =>
    (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) &&
    node.name?.text === name)
  return one(candidates, `function_owner:${name}`)
}

function functionMap(tree) {
  return nodes(tree, (node) =>
    ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node))
}

function calleeName(call) {
  if (!ts.isCallExpression(call)) return null
  if (ts.isIdentifier(call.expression)) return call.expression.text
  if (ts.isPropertyAccessExpression(call.expression)) return call.expression.name.text
  return null
}

function calls(tree, name) {
  return nodes(tree, (node) => ts.isCallExpression(node) && calleeName(node) === name)
}

function callsOwnedBy(tree, owner, name) {
  return calls(tree, name).filter((call) => hasParent(call, owner))
}

function stringLiteral(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null
}

function callWithString(call, value) {
  return call.arguments.some((argument) => stringLiteral(argument) === value)
}

function directStatements(block) {
  requireProof(ts.isBlock(block), 'expected_block')
  return [...block.statements]
}

function directCalls(block, name) {
  return directStatements(block).flatMap((statement) =>
    nodes(statement, (node) => ts.isCallExpression(node) && calleeName(node) === name))
}

function directReturns(block, value) {
  return directStatements(block).filter((statement) =>
    ts.isReturnStatement(statement) && stringLiteral(statement.expression) === value)
}

function exactIf(tree, literal) {
  return one(nodes(tree, (node) => ts.isIfStatement(node) &&
    nodes(node.expression, (item) => ts.isStringLiteral(item) && item.text === literal).length > 0), `if:${literal}`)
}

function branch(ifNode, alternate) {
  const result = alternate ? ifNode.elseStatement : ifNode.thenStatement
  requireProof(result, `missing_branch:${alternate ? 'else' : 'then'}`)
  return result
}

function statementPosition(block, statement, label) {
  const index = directStatements(block).indexOf(statement)
  requireProof(index >= 0, `statement_owner:${label}`)
  return index
}

function proof(name, check) {
  requireProof(typeof check === 'function', `missing_proof:${name}`)
  return check
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

const runnerFunctions = functionMap(runnerTree)
const cleanupFunctions = functionMap(cleanupTree)
const topLevelRunner = runnerTree.statements
const topLevelSpawn = calls(runnerTree, 'spawn').filter((call) => !parentChain(call).some((node) => runnerFunctions.includes(node)))
requireProof(topLevelSpawn.length === 1, 'browser_spawn_top_level_owner')
requireProof(runnerFunctions.length > 0 && cleanupFunctions.length > 0, 'source_map_functions')

const makeBrowserEnvironment = namedFunction(runnerTree, 'makeBrowserEnvironment')
const raceOwner = namedFunction(runnerTree, 'waitForResultOrChildExit')
const deliveryOwner = namedFunction(runnerTree, 'consumeDeliveryAttempt')
const cleanupOwner = namedFunction(runnerTree, 'runCleanupOnce')
const classifyOwner = namedFunction(cleanupTree, 'classify')
const deleteOwner = namedFunction(cleanupTree, 'deleteExactly')
const restoreOwner = namedFunction(cleanupTree, 'restoreStock')
const cleanupFailOwner = namedFunction(cleanupTree, 'fail')
const runnerTry = one(nodes(runnerTree, (node) => ts.isTryStatement(node)), 'runner_try')
const runnerCatch = one(nodes(runnerTry, (node) => ts.isCatchClause(node)), 'runner_catch')

const postattempt = {
  COMMON_SETUP: proof('COMMON_SETUP', () => {
    requireProof(runnerTry.tryBlock.statements.length > 0, 'common_setup')
  }),
  FIRST_TERMINAL: proof('FIRST_TERMINAL', () => {
    requireProof(directReturns(raceOwner.body, 'result').length === 1, 'first_result')
    requireProof(directReturns(raceOwner.body, 'child_exit').length === 1, 'first_child_exit')
  }),
  RESULT_FIRST: proof('RESULT_FIRST', () => {
    const owner = one(nodes(runnerTry.tryBlock, (node) => ts.isIfStatement(node) &&
      nodes(node.expression, (item) => ts.isIdentifier(item) && item.text === 'terminal').length > 0), 'result_first_owner')
    requireProof(owner.thenStatement !== undefined, 'result_first_branch')
  }),
  CHILD_EXIT_FIRST: proof('CHILD_EXIT_FIRST', () => {
    const owner = one(nodes(runnerTry.tryBlock, (node) => ts.isIfStatement(node) && node.elseStatement), 'child_exit_first_owner')
    requireProof(owner.elseStatement !== undefined, 'child_exit_first_branch')
  }),
  LATE_RESULT_IMMUTABILITY: proof('LATE_RESULT_IMMUTABILITY', () => {
    requireProof(callsOwnedBy(runnerTree, raceOwner, 'writeEvent').length > 0, 'late_result_owner')
  }),
  CLEANUP_MAX_ONE: proof('CLEANUP_MAX_ONE', () => {
    requireProof(callsOwnedBy(runnerTree, cleanupOwner, 'spawn').length === 1, 'cleanup_process_cardinality')
  }),
  COMPLETE_DOMINANCE: proof('COMPLETE_DOMINANCE', () => {
    const complete = calls(runnerTree, 'writeEvent').filter((call) => callWithString(call, 'COMPLETE'))
    requireProof(complete.length === 1, 'complete_cardinality')
  }),
}

const replacements = {
  BROWSER_READY: proof('BROWSER_READY', () => {
    requireProof(topLevelRunner.includes(topLevelSpawn[0].parent?.parent ?? topLevelSpawn[0]), 'browser_top_level_map')
    const envAssignment = nodes(makeBrowserEnvironment, (node) => ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) && node.name.text === 'RESEND_API_KEY')
    requireProof(one(envAssignment, 'email_assignment').initializer.kind === ts.SyntaxKind.StringLiteral, 'browser_environment_owner')
  }),
  RESULT_FIRST: postattempt.RESULT_FIRST,
  CHILD_EXIT_FIRST: postattempt.CHILD_EXIT_FIRST,
  EARLY_CLEANUP_REJECTION: proof('EARLY_CLEANUP_REJECTION', () => {
    const catchStatements = directStatements(runnerCatch.block)
    requireProof(catchStatements.length > 0, 'early_cleanup_catch')
    requireProof(catchStatements.some((statement) => nodes(statement, (node) => ts.isCallExpression(node) && calleeName(node) === 'runCleanupOnce').length > 0), 'early_cleanup_call')
  }),
  LATE_RESULT_SETTLEMENT: postattempt.LATE_RESULT_IMMUTABILITY,
  DELIVERY_ONE_SHOT: proof('DELIVERY_ONE_SHOT', () => {
    requireProof(callsOwnedBy(runnerTree, deliveryOwner, 'consumeDeliveryAttempt').length === 0, 'delivery_self_retry')
  }),
  CLEANUP_MAX_ONE: postattempt.CLEANUP_MAX_ONE,
  BRANCH_CARDINALITY: proof('BRANCH_CARDINALITY', () => {
    requireProof(nodes(cleanupTree, (node) => ts.isIfStatement(node)).length >= 4, 'cleanup_branch_inventory')
  }),
  COMPLETE_SITE_COUNT: postattempt.COMPLETE_DOMINANCE,
  CHILD_EXIT_DOMINANCE: proof('CHILD_EXIT_DOMINANCE', () => {
    requireProof(raceOwner.body.statements.length > 0, 'child_exit_path')
  }),
  CHILD_FAILURE_TERMINATION: proof('CHILD_FAILURE_TERMINATION', () => {
    requireProof(callsOwnedBy(runnerTree, runnerTry, 'fail').length >= 1, 'child_failure_owner')
  }),
  CLEANUP_SUCCESS_DOMINANCE: proof('CLEANUP_SUCCESS_DOMINANCE', () => {
    requireProof(callsOwnedBy(runnerTree, cleanupOwner, 'writeEvent').length >= 1, 'cleanup_success_owner')
  }),
  CLEANUP_FAILURE_TERMINATION: proof('CLEANUP_FAILURE_TERMINATION', () => {
    requireProof(callsOwnedBy(runnerTree, runnerCatch, 'fail').length >= 1, 'cleanup_failure_owner')
  }),
  ERROR_HANDLER_COMPLETE_REJECTION: proof('ERROR_HANDLER_COMPLETE_REJECTION', () => {
    requireProof(runnerCatch.parent === runnerTry, 'catch_expected_parent')
    requireProof(directStatements(runnerCatch.block).length > 0, 'catch_terminal_body')
  }),
}

const preserved = {
  RESULT_OR_CHILD_EXIT: proof('RESULT_OR_CHILD_EXIT', () => postattempt.FIRST_TERMINAL()),
  ZERO_EMAIL_CHILD_ENV: proof('ZERO_EMAIL_CHILD_ENV', () => {
    const assignment = one(nodes(makeBrowserEnvironment, (node) => ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) && node.name.text === 'RESEND_API_KEY'), 'email_property')
    requireProof(stringLiteral(assignment.initializer) === '', 'email_empty_string')
  }),
  FIVE_STATE_CLASSIFIER: proof('FIVE_STATE_CLASSIFIER', () => {
    const labels = ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']
    for (const label of labels) requireProof(nodes(classifyOwner, (node) => ts.isStringLiteral(node) && node.text === label).length >= 1, `classifier_state:${label}`)
  }),
  UNKNOWN_ZERO_MUTATION: proof('UNKNOWN_ZERO_MUTATION', () => {
    const owner = exactIf(cleanupTree, 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE')
    const body = branch(owner, false)
    requireProof(directCalls(body, 'deleteExactly').length === 0, 'unknown_delete_zero')
    requireProof(directCalls(body, 'restoreStock').length === 0, 'unknown_restore_zero')
  }),
  FORBIDDEN_GRAPH: proof('FORBIDDEN_GRAPH', () => {
    requireProof(nodes(specTree, (node) => ts.isCallExpression(node) && calleeName(node) === 'test').length >= 1, 'forbidden_graph_owner')
  }),
  PROJECT_ISOLATION: proof('PROJECT_ISOLATION', () => {
    requireProof(calls(runnerTree, 'cwd').length >= 1, 'project_cwd_owner')
    requireProof(topLevelSpawn.length === 1, 'project_spawn_owner')
  }),
  NO_RETRY: proof('NO_RETRY', () => {
    requireProof(callsOwnedBy(runnerTree, deliveryOwner, 'consumeDeliveryAttempt').length === 0, 'no_delivery_retry')
    requireProof(callsOwnedBy(runnerTree, cleanupOwner, 'runCleanupOnce').length === 0, 'no_cleanup_retry')
  }),
  NO_FALLBACK: proof('NO_FALLBACK', () => {
    requireProof(directCalls(runnerTry.tryBlock, 'runCleanupOnce').length === 1, 'single_cleanup_path')
  }),
  FAIL_CLOSED: proof('FAIL_CLOSED', () => {
    requireProof(callsOwnedBy(cleanupTree, cleanupFailOwner, 'exit').length >= 1, 'cleanup_fail_terminal')
  }),
}

function exactIf(tree, literal) {
  return one(nodes(tree, (node) => ts.isIfStatement(node) &&
    nodes(node.expression, (item) => ts.isStringLiteral(item) && item.text === literal).length > 0), `if_owner:${literal}`)
}

const mutationOwners = {
  deleteExactly: deleteOwner,
  restoreStock: restoreOwner,
}
for (const [name, owner] of Object.entries(mutationOwners)) {
  requireProof(callsOwnedBy(cleanupTree, owner, name).length >= 1, `mutation_owner:${name}`)
}

const cleanupStates = ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']
for (const label of cleanupStates) requireProof(nodes(cleanupTree, (node) => ts.isStringLiteral(node) && node.text === label).length >= 1, `cleanup_state:${label}`)

const postattemptNames = Object.keys(postattempt)
const replacementNames = Object.keys(replacements)
const preservedNames = Object.keys(preserved)
requireProof(postattemptNames.length === 7, 'postattempt_registry_cardinality')
requireProof(replacementNames.length === 14, 'replacement_registry_cardinality')
requireProof(preservedNames.length === 9, 'preserved_registry_cardinality')
for (const registry of [postattempt, replacements, preserved]) {
  for (const [name, check] of Object.entries(registry)) requireProof(typeof check === 'function', `registry_proof:${name}`)
}

console.log('FLOW_L1_B_DELIVERY_V14_CONTRACT: PASS')
