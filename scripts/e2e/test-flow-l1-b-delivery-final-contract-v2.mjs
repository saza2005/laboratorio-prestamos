import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const checkerDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(checkerDir, '..', '..')
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

function prove(condition, code) {
  if (!condition) fail(code)
}

function read(relativePath) {
  const absolute = path.resolve(root, relativePath)
  prove(absolute.startsWith(`${root}${path.sep}`), `path_scope:${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function parse(name, source, kind) {
  const tree = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, kind)
  prove(tree.parseDiagnostics.length === 0, `parse:${name}`)
  return tree
}

function walk(node, visit) {
  visit(node)
  ts.forEachChild(node, child => walk(child, visit))
}

function nodes(owner, predicate) {
  const result = []
  walk(owner, node => { if (predicate(node)) result.push(node) })
  return result
}

function single(items, code) {
  prove(items.length === 1, `cardinality:${code}`)
  return items[0]
}

function nameOf(call) {
  if (!ts.isCallExpression(call)) return null
  if (ts.isIdentifier(call.expression)) return call.expression.text
  if (ts.isPropertyAccessExpression(call.expression)) return call.expression.name.text
  return null
}

function textOf(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  return null
}

function hasStringArgument(call, value) {
  return call.arguments.some(argument => textOf(argument) === value)
}

function namedFunction(tree, name) {
  return single(nodes(tree, node =>
    (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) &&
    node.name?.text === name), `function:${name}`)
}

function topLevelBinding(tree, name) {
  return single(tree.statements.filter(ts.isVariableStatement).flatMap(statement =>
    statement.declarationList.declarations.filter(declaration =>
      ts.isIdentifier(declaration.name) && declaration.name.text === name)), `binding:${name}`)
}

function property(object, name) {
  prove(ts.isObjectLiteralExpression(object), `object:${name}`)
  return single(object.properties.filter(item =>
    (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) && item.name.text === name), `property:${name}`)
}

function callProperty(call, name) {
  prove(ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression), `call_property:${name}`)
  prove(call.expression.name.text === name, `call_name:${name}`)
  return call.expression.expression
}

function sourcePositions(tree, predicate) {
  return nodes(tree, predicate).map(node => node.getStart(tree)).sort((a, b) => a - b)
}

const runner = read(runnerPath)
const cleanup = read(cleanupPath)
const spec = read(specPath)
prove(digest(runner) === pins[runnerPath], 'runner_hash')
prove(digest(cleanup) === pins[cleanupPath], 'cleanup_hash')
prove(digest(spec) === pins[specPath], 'spec_hash')

const runnerTree = parse(runnerPath, runner, ts.ScriptKind.JS)
const cleanupTree = parse(cleanupPath, cleanup, ts.ScriptKind.JS)
const specTree = parse(specPath, spec, ts.ScriptKind.TS)

// A. Artifact identity is established above; the remaining checks are bounded
// to the named owners and direct runtime boundaries.
function artifactIdentity() {
  prove(runner.includes("const runnerPath = 'scripts/e2e/run-flow-l1-b-delivery-v4.mjs'") === false, 'checker_self_reference')
  prove(runner.includes("const cleanupPath = 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'"), 'runner_cleanup_reference')
  prove(runner.includes("const actualSpec = 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'"), 'runner_spec_reference')
}

function executionBudget() {
  const spawn = single(nodes(runnerTree, node => ts.isCallExpression(node) && nameOf(node) === 'spawn'), 'playwright_spawn')
  prove(spawn.arguments.length === 3, 'spawn_shape')
  prove(spawn.arguments[1].getText(runnerTree).includes("'--retries=0'"), 'no_playwright_retry')
  prove(spawn.arguments[1].getText(runnerTree).includes("'--workers=1'"), 'one_playwright_worker')
  prove(nodes(runnerTree, node => ts.isCallExpression(node) && nameOf(node) === 'consumeDeliveryAttempt').length === 1, 'one_delivery_attempt')
  const cleanupOwner = namedFunction(runnerTree, 'runCleanupOnce')
  prove(nodes(cleanupOwner, node => ts.isCallExpression(node) && nameOf(node) === 'execFileSync').length === 1, 'one_cleanup_process')
  prove(nodes(cleanupOwner, node => ts.isIfStatement(node) && node.expression.getText(runnerTree).includes('cleanupAttempted')).length === 1, 'cleanup_guard')
  prove(!runner.includes('fallback'), 'no_fallback_surface')
}

function e2eIsolation() {
  prove(nodes(runnerTree, node => ts.isCallExpression(node) && nameOf(node) === 'loadEnvFile').some(call => textOf(call.arguments[0]) === '.env.e2e'), 'e2e_env_load')
  prove(runner.includes('E2E_EXPECTED_PROJECT_REF'), 'expected_project_guard')
  prove(runner.includes('NEXT_PUBLIC_SUPABASE_URL'), 'e2e_url_guard')
  prove(runner.includes('chromium-lab-staff'), 'staff_project_only')
  prove(runner.includes('--no-deps'), 'no_dependency_fallback')
  prove(!runner.includes('production'), 'production_project_excluded')
}

function finalChildEnvironment() {
  const environmentOwner = namedFunction(runnerTree, 'makeBrowserEnvironment')
  const returnStatement = single(environmentOwner.body.statements.filter(ts.isReturnStatement), 'environment_return')
  const fromEntries = returnStatement.expression
  prove(ts.isCallExpression(fromEntries) && nameOf(fromEntries) === 'fromEntries', 'final_env_from_entries')
  const filterCall = single(fromEntries.arguments.filter(argument => ts.isCallExpression(argument) && nameOf(argument) === 'filter'), 'final_env_filter')
  const entriesCall = callProperty(filterCall, 'filter')
  prove(ts.isCallExpression(entriesCall) && nameOf(entriesCall) === 'entries', 'final_env_entries')
  prove(entriesCall.arguments.length === 1 && ts.isObjectLiteralExpression(entriesCall.arguments[0]), 'final_env_object')
  const resend = property(entriesCall.arguments[0], 'RESEND_API_KEY')
  prove(ts.isPropertyAssignment(resend) && textOf(resend.initializer) === '', 'resend_empty')
  const callback = filterCall.arguments[0]
  prove(ts.isArrowFunction(callback) && ts.isBinaryExpression(callback.body), 'filter_callback')
  prove(callback.body.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken &&
    ts.isIdentifier(callback.body.right) && callback.body.right.text === 'undefined', 'resend_not_filtered')
  const childEnv = topLevelBinding(runnerTree, 'childEnv')
  prove(childEnv.initializer && ts.isCallExpression(childEnv.initializer) && nameOf(childEnv.initializer) === 'makeBrowserEnvironment', 'child_env_binding')
  const spawn = single(nodes(runnerTree, node => ts.isCallExpression(node) && nameOf(node) === 'spawn'), 'spawn_for_env')
  const options = spawn.arguments[2]
  const env = property(options, 'env')
  prove(ts.isIdentifier(env.initializer) && env.initializer.text === 'childEnv', 'spawn_final_env')
}

function runtimeBoundaries() {
  const eventNames = ['ACTION_ARMED', 'FINAL_DELIVERY_ARMED', 'DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED']
  const positions = eventNames.map(name => single(sourcePositions(specTree, node =>
    ts.isCallExpression(node) && nameOf(node) === 'writeEvent' && hasStringArgument(node, name)), `spec_event:${name}`))
  prove(positions.every((position, index) => index === 0 || position > positions[index - 1]), 'event_order')
  prove(nodes(specTree, node => ts.isCallExpression(node) && nameOf(node) === 'waitForResponse').length >= 1, 'server_action_boundary')
  prove(spec.includes("headers()['next-action']"), 'server_action_header_boundary')
  prove(spec.includes('deliveryServerActionPosts !== 1'), 'server_action_one_write')
}

function eventMonitorRepair() {
  const wait = namedFunction(runnerTree, 'waitForEvent')
  prove(nodes(wait, node => ts.isIdentifier(node) && node.text === 'browserOwnedEventOrder').length >= 1, 'event_order_owner')
  prove(nodes(wait, node => ts.isPropertyAssignment(node) && node.name.getText(runnerTree) === 'implied').length >= 1, 'implied_evidence')
  prove(nodes(wait, node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.GreaterThanToken &&
    ts.isIdentifier(node.left) && node.left.text === 'stateIndex' && ts.isIdentifier(node.right) && node.right.text === 'expectedIndex').length === 2, 'monotonic_indices')
  prove(nodes(wait, node => ts.isBinaryExpression(node) && textOf(node.left) === 'delivery_event_unproven_' &&
    ts.isCallExpression(node.right) && nameOf(node.right) === 'toLowerCase').length >= 1, 'dynamic_failure_label')
  prove(nodes(wait, node => ts.isPropertyAssignment(node) && node.name.getText(runnerTree) === 'implied' &&
    textOf(node.initializer) === true).length >= 1, 'later_state_preserves_evidence')
}

function cleanupContract() {
  const classify = namedFunction(cleanupTree, 'classify')
  for (const state of ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']) {
    prove(nodes(classify, node => ts.isStringLiteral(node) && node.text === state).length >= 1, `cleanup_state:${state}`)
  }
  prove(nodes(cleanupTree, node => ts.isFunctionDeclaration(node) && node.name?.text === 'deleteExactly').length === 1, 'cleanup_delete_owner')
  prove(cleanup.includes("if (classification === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE') fail"), 'cleanup_unknown_fail_closed')
  prove(cleanup.includes("if (snapshot.cleanupAttempt !== 0"), 'cleanup_once_guard')
  prove(cleanup.includes('restoreStock'), 'cleanup_restore_path')
}

function terminalAuthorization() {
  const complete = single(nodes(runnerTree, node => ts.isCallExpression(node) && nameOf(node) === 'writeEvent' && hasStringArgument(node, 'COMPLETE')), 'complete_event')
  const cleanup = single(nodes(runnerTree, node => ts.isExpressionStatement(node) && node.getText(runnerTree).includes('await runCleanupOnce()')), 'cleanup_before_complete')
  prove(complete.getStart(runnerTree) > cleanup.getStart(runnerTree), 'complete_after_cleanup')
  prove(runner.includes("if (childCode !== 0) fail('delivery_browser_failed_after_cleanup')"), 'failure_before_complete')
  prove(runner.includes('process.exit(1)'), 'failure_terminal')
}

artifactIdentity()
executionBudget()
e2eIsolation()
finalChildEnvironment()
runtimeBoundaries()
eventMonitorRepair()
cleanupContract()
terminalAuthorization()
console.log('FLOW_L1_B_DELIVERY_FINAL_V2_CONTRACT: PASS')
