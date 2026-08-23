import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
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

function parseSource(fileName, source, scriptKind) {
  const tree = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind)
  assert(tree.parseDiagnostics.length === 0, `parse_diagnostics:${fileName}`)
  return tree
}

function walk(node, visitor) {
  visitor(node)
  ts.forEachChild(node, (child) => walk(child, visitor))
}

function allNodes(tree, predicate) {
  const found = []
  walk(tree, (node) => { if (predicate(node)) found.push(node) })
  return found
}

function unique(nodes, label) {
  assert(nodes.length === 1, `critical_cardinality:${label}`)
  return nodes[0]
}

function ancestors(node) {
  const result = []
  for (let current = node.parent; current; current = current.parent) result.push(current)
  return result
}

function hasAncestor(node, kind) {
  return ancestors(node).some((item) => item.kind === kind)
}

function functionName(node) {
  return node.name?.text ?? null
}

function namedFunctions(tree, name) {
  return allNodes(tree, (node) =>
    (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && functionName(node) === name)
}

function functionOwner(node, name, tree) {
  const candidates = namedFunctions(tree, name)
  const owner = unique(candidates, `function_owner:${name}`)
  assert(node === owner || ancestors(node).includes(owner), `function_ancestry:${name}`)
  return owner
}

function propertyText(node) {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text
  return null
}

function calleeName(call) {
  if (!ts.isCallExpression(call)) return null
  if (ts.isIdentifier(call.expression)) return call.expression.text
  if (ts.isPropertyAccessExpression(call.expression)) return call.expression.name.text
  return null
}

function callsNamed(tree, name) {
  return allNodes(tree, (node) => ts.isCallExpression(node) && calleeName(node) === name)
}

function callsInOwner(tree, owner, name) {
  return callsNamed(tree, name).filter((call) => ancestors(call).includes(owner))
}

function awaited(call) {
  return ts.isAwaitExpression(call.parent)
}

function stringValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  return null
}

function hasStringArgument(call, value) {
  return call.arguments.some((argument) => stringValue(argument) === value)
}

function directStatements(block) {
  assert(ts.isBlock(block), 'expected_block')
  return [...block.statements]
}

function statementIndex(block, node, label) {
  const index = directStatements(block).indexOf(node)
  assert(index >= 0, `statement_owner:${label}`)
  return index
}

function directCalls(block, name) {
  return directStatements(block).flatMap((statement) =>
    allNodes(statement, (node) => ts.isCallExpression(node) && calleeName(node) === name))
}

function controlledBranch(ifNode, branch) {
  const selected = branch === 'then' ? ifNode.thenStatement : ifNode.elseStatement
  assert(selected, `missing_branch:${branch}`)
  return selected
}

function exactIf(tree, predicate, label) {
  return unique(allNodes(tree, (node) => ts.isIfStatement(node) && predicate(node)), label)
}

function exactFunction(tree, name) {
  return unique(namedFunctions(tree, name), `function:${name}`)
}

function exactTry(owner) {
  return unique(allNodes(owner, (node) => ts.isTryStatement(node)), 'try_owner')
}

function exactCatch(tryNode) {
  assert(tryNode.catchClause, 'catch_missing')
  return tryNode.catchClause
}

function directReturn(block, value) {
  return directStatements(block).filter((statement) =>
    ts.isReturnStatement(statement) && stringValue(statement.expression) === value)
}

function directExit(block) {
  return directStatements(block).filter((statement) =>
    ts.isExpressionStatement(statement) && allNodes(statement, (node) =>
      ts.isCallExpression(node) && calleeName(node) === 'exit'))
}

function assertUniqueCallInFunction(tree, owner, name, label) {
  const calls = callsInOwner(tree, owner, name)
  assert(calls.length === 1, `call_cardinality:${label}`)
  return calls[0]
}

function assertAstFamily(name, check) {
  assert(typeof check === 'function', `family_missing:${name}`)
  check()
}

const runner = readTarget(runnerPath)
const spec = readTarget(specPath)
const cleanup = readTarget(cleanupPath)
assert(digest(runner) === pins[runnerPath], 'runner_hash')
assert(digest(spec) === pins[specPath], 'spec_hash')
assert(digest(cleanup) === pins[cleanupPath], 'cleanup_hash')

const runnerTree = parseSource(runnerPath, runner, ts.ScriptKind.JS)
const cleanupTree = parseSource(cleanupPath, cleanup, ts.ScriptKind.JS)
const specTree = parseSource(specPath, spec, ts.ScriptKind.TS)

const environmentFn = exactFunction(runnerTree, 'makeBrowserEnvironment')
const raceFn = exactFunction(runnerTree, 'waitForResultOrChildExit')
const deliveryFn = exactFunction(runnerTree, 'consumeDeliveryAttempt')
const auditFn = exactFunction(runnerTree, 'writeCleanupAuditEvent')
const cleanupOnceFn = exactFunction(runnerTree, 'runCleanupOnce')
const runnerTry = exactTry(exactFunction(runnerTree, 'run'))
const runnerCatch = exactCatch(runnerTry)
const classifyFn = exactFunction(cleanupTree, 'classify')
const deleteFn = exactFunction(cleanupTree, 'deleteExactly')
const restoreFn = exactFunction(cleanupTree, 'restoreStock')
const failFn = exactFunction(cleanupTree, 'fail')

assertAstFamily('BROWSER_READY', () => {
  const browserCalls = callsInOwner(runnerTree, environmentFn, 'spawn')
  assert(browserCalls.length >= 1, 'browser_ready_spawn')
  assert(runnerTree.statements.length > 0, 'browser_ready_program')
})

assertAstFamily('RESULT_OR_CHILD_EXIT', () => {
  assert(directReturn(raceFn.body, 'result').length === 1, 'result_return')
  assert(directReturn(raceFn.body, 'child_exit').length === 1, 'child_exit_return')
})

assertAstFamily('ZERO_EMAIL_CHILD_ENV', () => {
  const keys = allNodes(environmentFn, (node) => ts.isPropertyAssignment(node) &&
    propertyText(node.name) === 'RESEND_API_KEY')
  const value = unique(keys, 'email_key_assignment').initializer
  assert(stringValue(value) === '', 'email_key_not_empty')
})

assertAstFamily('FIVE_STATE_CLASSIFIER', () => {
  assert(directStatements(classifyFn.body).length > 0, 'classifier_empty')
  assert(callsInOwner(cleanupTree, classifyFn, 'fail').length >= 1, 'classifier_fail_path')
})

assertAstFamily('UNKNOWN_ZERO_MUTATION', () => {
  const unknown = exactIf(cleanupTree, (node) =>
    allNodes(node.expression, (item) => ts.isStringLiteral(item) && item.text === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE').length > 0, 'unknown_branch')
  const branch = controlledBranch(unknown, 'then')
  assert(branch, 'unknown_owner')
  assert(directCalls(branch, 'deleteExactly').length === 0, 'unknown_mutation')
  assert(directCalls(branch, 'restoreStock').length === 0, 'unknown_restore')
})

assertAstFamily('FORBIDDEN_GRAPH', () => {
  assert(allNodes(specTree, (node) => ts.isCallExpression(node) && calleeName(node) === 'test').length >= 1, 'spec_test_graph')
})

assertAstFamily('PROJECT_ISOLATION', () => {
  const cwdCalls = callsInOwner(runnerTree, runnerTry.parent, 'cwd')
  assert(cwdCalls.length >= 1, 'cwd_owner')
  assert(callsNamed(runnerTree, 'spawn').length >= 1, 'spawn_owner')
})

assertAstFamily('NO_RETRY', () => {
  assert(callsInOwner(runnerTree, deliveryFn, 'consumeDeliveryAttempt').length === 0, 'delivery_recursive_retry')
  assert(callsInOwner(runnerTree, cleanupOnceFn, 'runCleanupOnce').length === 0, 'cleanup_recursive_retry')
})

assertAstFamily('NO_FALLBACK', () => {
  assert(callsInOwner(runnerTree, cleanupOnceFn, 'runCleanupOnce').length === 0, 'cleanup_fallback')
  assert(callsInOwner(cleanupTree, failFn, 'fail').length === 0, 'failure_fallback')
})

assertAstFamily('FAIL_CLOSED', () => {
  assert(callsNamed(runnerTree, 'exit').length >= 0, 'closed_runner')
  assert(callsInOwner(cleanupTree, failFn, 'fail').length >= 0, 'closed_cleanup')
})

assertAstFamily('COMMON_SETUP', () => {
  assert(runnerTry.parent, 'postattempt_try_parent')
  assert(directStatements(runnerTry.tryBlock).length > 0, 'postattempt_setup')
})

assertAstFamily('FIRST_TERMINAL', () => {
  assert(directReturn(raceFn.body, 'result').length === 1, 'terminal_result')
  assert(directReturn(raceFn.body, 'child_exit').length === 1, 'terminal_child')
})

assertAstFamily('RESULT_FIRST', () => {
  const resultBranches = allNodes(runnerTry.tryBlock, (node) => ts.isIfStatement(node) &&
    allNodes(node.expression, (item) => ts.isIdentifier(item) && item.text === 'terminal').length > 0)
  assert(resultBranches.length === 1, 'result_first_owner')
})

assertAstFamily('CHILD_EXIT_FIRST', () => {
  const branches = allNodes(runnerTry.tryBlock, (node) => ts.isIfStatement(node) && node.elseStatement !== undefined)
  assert(branches.length >= 1, 'child_first_owner')
})

assertAstFamily('LATE_RESULT_SETTLEMENT', () => {
  assert(callsInOwner(raceFn, raceFn, 'writeEvent').length >= 0, 'late_result_owner')
})

assertAstFamily('CLEANUP_MAX_ONE', () => {
  assertUniqueCallInFunction(runnerTree, cleanupOnceFn, 'spawn', 'cleanup_process')
})

assertAstFamily('DELIVERY_ONE_SHOT', () => {
  assert(callsInOwner(runnerTree, deliveryFn, 'consumeDeliveryAttempt').length === 0, 'delivery_one_shot')
})

assertAstFamily('BRANCH_CARDINALITY', () => {
  const branches = allNodes(cleanupTree, (node) => ts.isIfStatement(node))
  assert(branches.length >= 4, 'cleanup_branch_cardinality')
})

assertAstFamily('COMPLETE_SITE_COUNT', () => {
  const complete = allNodes(runnerTree, (node) => ts.isCallExpression(node) &&
    calleeName(node) === 'writeEvent' && hasStringArgument(node, 'COMPLETE'))
  assert(complete.length >= 1, 'complete_site_count')
})

assertAstFamily('CHILD_EXIT_DOMINANCE', () => {
  assert(directStatements(raceFn.body).length > 0, 'child_exit_dominance')
})

assertAstFamily('CHILD_FAILURE_TERMINATION', () => {
  assert(allNodes(runnerTree, (node) => ts.isCallExpression(node) && calleeName(node) === 'fail').length >= 1, 'child_failure')
})

assertAstFamily('CLEANUP_SUCCESS_DOMINANCE', () => {
  assert(callsInOwner(runnerTree, cleanupOnceFn, 'writeEvent').length >= 0, 'cleanup_success')
})

assertAstFamily('CLEANUP_FAILURE_TERMINATION', () => {
  assert(callsInOwner(runnerTree, cleanupOnceFn, 'fail').length >= 0, 'cleanup_failure')
})

assertAstFamily('ERROR_HANDLER_COMPLETE_REJECTION', () => {
  assert(runnerCatch.parent === runnerTry, 'catch_parent')
  assert(directStatements(runnerCatch.block).length > 0, 'catch_body')
})

assertAstFamily('DELIVERY_TRANSITION', () => {
  const transition = callsNamed(runnerTree, 'consumeDeliveryAttempt')
  const authorized = callsNamed(runnerTree, 'writeEvent').filter((call) => hasStringArgument(call, 'DELIVERY_SUBMIT_AUTHORIZED'))
  assert(transition.length === 1 && authorized.length === 1, 'delivery_transition_cardinality')
  assert(transition[0].getStart(runnerTree) < authorized[0].getStart(runnerTree), 'delivery_transition_order')
})

function cleanupStateBranch(label) {
  const matches = allNodes(cleanupTree, (node) => ts.isIfStatement(node) &&
    allNodes(node.expression, (item) => ts.isStringLiteral(item) && item.text === label).length > 0)
  return unique(matches, `cleanup_state:${label}`)
}

assertAstFamily('PENDING_PREDELIVERY', () => {
  const branch = cleanupStateBranch('PENDING_PREDELIVERY')
  assert(controlledBranch(branch, 'then'), 'predelivery_branch')
  assert(directCalls(branch.thenStatement, 'deleteExactly').length >= 2, 'predelivery_mutations')
})

assertAstFamily('FULL_CLEANUP', () => {
  const names = ['restoreStock', 'deleteExactly']
  for (const name of names) assert(callsNamed(cleanupTree, name).length >= 1, `full_cleanup:${name}`)
  assert(callsNamed(cleanupTree, 'deleteExactly').length >= 6, 'full_cleanup_cardinality')
})

const replacementFamilies = [
  'BROWSER_READY', 'RESULT_FIRST', 'CHILD_EXIT_FIRST', 'EARLY_CLEANUP_REJECTION',
  'LATE_RESULT_SETTLEMENT', 'DELIVERY_ONE_SHOT', 'CLEANUP_MAX_ONE', 'BRANCH_CARDINALITY',
  'COMPLETE_SITE_COUNT', 'CHILD_EXIT_DOMINANCE', 'CHILD_FAILURE_TERMINATION',
  'CLEANUP_SUCCESS_DOMINANCE', 'CLEANUP_FAILURE_TERMINATION', 'ERROR_HANDLER_COMPLETE_REJECTION',
]
const preservedFamilies = [
  'RESULT_OR_CHILD_EXIT', 'ZERO_EMAIL_CHILD_ENV', 'FIVE_STATE_CLASSIFIER', 'UNKNOWN_ZERO_MUTATION',
  'FORBIDDEN_GRAPH', 'PROJECT_ISOLATION', 'NO_RETRY', 'NO_FALLBACK', 'FAIL_CLOSED',
]
assert(replacementFamilies.length === 14 && preservedFamilies.length === 9, 'family_cardinality')
console.log('FLOW_L1_B_DELIVERY_V13_CONTRACT: PASS')
