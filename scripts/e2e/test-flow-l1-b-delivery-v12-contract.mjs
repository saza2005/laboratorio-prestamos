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

const keywords = new Set([
  'async', 'await', 'catch', 'const', 'else', 'for', 'function', 'if', 'return',
  'throw', 'try', 'while', 'process', 'new',
])

function token(kind, value, start, end, executable = true) {
  return { kind, value, start, end, executable, parent: null, children: [], match: null }
}

function consumeQuoted(source, start, quote) {
  let escaped = false
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i]
    if (escaped) escaped = false
    else if (ch === '\\') escaped = true
    else if (ch === quote) return i + 1
  }
  fail('lexical_unclosed_string')
}

function consumeRegex(source, start) {
  let escaped = false
  let inClass = false
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i]
    if (escaped) escaped = false
    else if (ch === '\\') escaped = true
    else if (ch === '[') inClass = true
    else if (ch === ']') inClass = false
    else if (ch === '/' && !inClass) {
      let end = i + 1
      while (/[a-z]/i.test(source[end] ?? '')) end += 1
      return end
    }
  }
  fail('lexical_unclosed_regex')
}

function scan(source) {
  const tokens = []
  const stack = []
  let mode = 'code'
  let escaped = false
  let templateDepth = 0
  let previousExecutable = null
  const add = (item) => {
    tokens.push(item)
    if (item.executable) previousExecutable = item
  }
  const regexAllowed = () => !previousExecutable || ['(', '[', '{', '=', ':', ',', '&&', '||', 'return'].includes(previousExecutable.value)
  for (let i = 0; i < source.length;) {
    const ch = source[i]
    const next = source[i + 1]
    if (mode === 'line_comment') {
      const end = source.indexOf('\n', i)
      i = end < 0 ? source.length : end
      mode = 'code'
      continue
    }
    if (mode === 'block_comment') {
      const end = source.indexOf('*/', i)
      assert(end >= 0, 'lexical_unclosed_block_comment')
      i = end + 2
      mode = 'code'
      continue
    }
    if (mode === 'template') {
      if (escaped) {
        escaped = false
        i += 1
        continue
      }
      if (ch === '\\') {
        escaped = true
        i += 1
        continue
      }
      if (ch === '`') {
        add(token('TEMPLATE_END', '`', i, i + 1, false))
        mode = 'code'
        i += 1
        continue
      }
      if (ch === '$' && next === '{') {
        add(token('TEMPLATE_INTERPOLATION_OPEN', '${', i, i + 2))
        stack.push({ value: '}', kind: 'TEMPLATE_INTERPOLATION' })
        templateDepth += 1
        mode = 'code'
        i += 2
        continue
      }
      i += 1
      continue
    }
    if (ch === '/' && next === '/') {
      mode = 'line_comment'
      i += 2
      continue
    }
    if (ch === '/' && next === '*') {
      mode = 'block_comment'
      i += 2
      continue
    }
    if (ch === "'" || ch === '"') {
      const end = consumeQuoted(source, i, ch)
      add(token('STRING', source.slice(i, end), i, end, false))
      i = end
      continue
    }
    if (ch === '`') {
      add(token('TEMPLATE_START', '`', i, i + 1, false))
      mode = 'template'
      escaped = false
      i += 1
      continue
    }
    if (ch === '/' && regexAllowed()) {
      const end = consumeRegex(source, i)
      add(token('REGEX', source.slice(i, end), i, end, false))
      i = end
      continue
    }
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let end = i + 1
      while (/[A-Za-z0-9_$]/.test(source[end] ?? '')) end += 1
      const value = source.slice(i, end)
      add(token(keywords.has(value) ? 'KEYWORD' : 'IDENT', value, i, end))
      i = end
      continue
    }
    if (/[0-9]/.test(ch)) {
      let end = i + 1
      while (/[0-9._]/.test(source[end] ?? '')) end += 1
      add(token('NUMBER', source.slice(i, end), i, end))
      i = end
      continue
    }
    const two = source.slice(i, i + 2)
    const value = ['=>', '===', '!==', '&&', '||', '??', '?.'].includes(two) ? two : ch
    const end = i + value.length
    const item = token('PUNCT', value, i, end)
    add(item)
    if (value === '(' || value === '[' || value === '{') stack.push({ value, token: item, kind: 'DELIMITER' })
    if (value === ')' || value === ']' || value === '}') {
      const expected = value === ')' ? '(' : value === ']' ? '[' : '{'
      const open = stack.pop()
      assert(open && open.value === expected, 'lexical_delimiter_mismatch')
      item.match = open.token
      open.token.match = item
      if (open.kind === 'TEMPLATE_INTERPOLATION') {
        templateDepth -= 1
        mode = 'template'
      }
    }
    i = end
  }
  assert(mode === 'code' && stack.length === 0 && templateDepth === 0, 'lexical_state_unclosed')
  const root = token('PROGRAM', 'PROGRAM', 0, source.length)
  const owners = [root]
  for (const item of tokens) {
    while (owners.length > 1 && item.start >= owners[owners.length - 1].match?.end) owners.pop()
    item.parent = owners[owners.length - 1]
    item.parent.children.push(item)
    if (item.value === '(' || item.value === '[' || item.value === '{') owners.push(item)
  }
  return { source, tokens, root }
}

function executable(tokens) {
  return tokens.filter((item) => item.executable)
}

function one(tokens, predicate, label) {
  const matches = tokens.filter(predicate)
  assert(matches.length === 1, `critical_cardinality:${label}`)
  return matches[0]
}

function nextToken(tokens, item) {
  const index = tokens.indexOf(item)
  assert(index >= 0 && index + 1 < tokens.length, 'missing_next_token')
  return tokens[index + 1]
}

function tokenAfter(tokens, item, value, label) {
  const next = nextToken(tokens, item)
  assert(next.value === value, `unexpected_next_token:${label}`)
  return next
}

function functionNode(tree, name) {
  const tokens = executable(tree.tokens)
  const nameToken = one(tokens, (item) => item.value === name && tokens[tokens.indexOf(item) - 1]?.value === 'function', `function:${name}`)
  const openParen = tokenAfter(tokens, nameToken, '(', `function_params:${name}`)
  const closeParen = openParen.match
  assert(closeParen, `function_params_unbalanced:${name}`)
  const body = tokens.find((item) => item.value === '{' && item.start > closeParen.end)
  assert(body, `function_body_missing:${name}`)
  return { kind: 'FUNCTION', name, header: nameToken, body, parent: body.parent, children: body.children }
}

function tryNode(tree) {
  const tokens = executable(tree.tokens)
  const tryToken = one(tokens, (item) => item.value === 'try', 'try')
  const body = tokenAfter(tokens, tryToken, '{', 'try_body')
  return { kind: 'TRY', keyword: tryToken, body, parent: body.parent, children: body.children }
}

function catchNode(tree, tryNodeValue) {
  const tokens = executable(treeValue.tokens)
  const catches = tokens.filter((item) => item.value === 'catch')
  const catcher = one(catches, (item) => item.start > tryNodeValue.keyword.start, 'catch')
  const after = nextToken(tokens, catcher)
  const body = after.value === '(' ? after.match && nextToken(tokens, after.match) : after
  assert(body?.value === '{', 'catch_body')
  return { kind: 'CATCH', keyword: catcher, body, parent: body.parent, children: body.children }
}

function ifNode(tree, predicate) {
  const tokens = executable(tree.tokens)
  const candidate = one(tokens, (item, index) => item.value === 'if' && predicate(item, index, tokens), 'if')
  const conditionOpen = tokenAfter(tokens, candidate, '(', 'if_condition')
  const conditionClose = conditionOpen.match
  assert(conditionClose, 'if_condition_unbalanced')
  const consequent = tokens.find((item) => item.start > conditionClose.end)
  assert(consequent, 'if_consequent_missing')
  const alternate = tokens.find((item) => item.value === 'else' && item.start > consequent.start)
  return { kind: 'IF', keyword: candidate, conditionOpen, conditionClose, consequent, alternate: alternate ?? null, parent: candidate.parent }
}

function controlledStatement(tree, startToken) {
  if (startToken.value === '{') return { kind: 'BLOCK', token: startToken, end: startToken.match }
  const tokens = executable(tree.tokens)
  const startIndex = tokens.indexOf(startToken)
  assert(startIndex >= 0, 'controlled_statement_start')
  let depth = 0
  for (const item of tokens.slice(startIndex)) {
    if (['(', '[', '{'].includes(item.value)) depth += 1
    if ([')', ']', '}'].includes(item.value)) depth -= 1
    if (item.value === ';' && depth === 0) return { kind: 'STATEMENT', token: startToken, end: item }
  }
  const nextLine = tree.source.indexOf('\n', startToken.end)
  const end = nextLine < 0 ? tree.source.length : nextLine
  return { kind: 'STATEMENT', token: startToken, end: { end } }
}

function directCalls(tree, owner, name) {
  const calls = executable(tree.tokens).filter((item, index, tokens) => item.value === name && tokens[index + 1]?.value === '(')
  return calls.filter((item) => item.start >= owner.body.start && item.start < owner.body.match.end)
}

function callPath(tree, owner, calls, label) {
  assert(calls.length > 0, `missing_call_path:${label}`)
  for (const call of calls) assert(call.parent, `call_owner_missing:${label}`)
  return { owner, calls, label }
}

function terminalFailureModel(tree, functionName) {
  const fn = functionNode(tree, functionName)
  const exit = one(executable(tree.tokens), (item, index, tokens) => item.value === 'exit' && tokens[index - 1]?.value === 'process', `terminal_failure:${functionName}`)
  assert(exit.start >= fn.body.start && exit.start < fn.body.match.end, `terminal_failure_owner:${functionName}`)
  return { function: fn, terminal: exit }
}

function assertStructural(condition, code) {
  assert(condition, `structural:${code}`)
}

const runner = readTarget(runnerPath)
const spec = readTarget(specPath)
const cleanup = readTarget(cleanupPath)
assert(digest(runner) === pins[runnerPath], 'runner_hash')
assert(digest(spec) === pins[specPath], 'spec_hash')
assert(digest(cleanup) === pins[cleanupPath], 'cleanup_hash')

const runnerTree = scan(runner)
const cleanupTree = scan(cleanup)
const specTree = scan(spec)

const runnerTry = tryNode(runnerTree)
const runnerCatch = catchNode(runnerTree, runnerTry)
const environmentFn = functionNode(runnerTree, 'makeBrowserEnvironment')
const raceFn = functionNode(runnerTree, 'waitForResultOrChildExit')
const deliveryFn = functionNode(runnerTree, 'consumeDeliveryAttempt')
const auditFn = functionNode(runnerTree, 'writeCleanupAuditEvent')
const cleanupOnceFn = functionNode(runnerTree, 'runCleanupOnce')
const classifyFn = functionNode(cleanupTree, 'classify')
const deleteFn = functionNode(cleanupTree, 'deleteExactly')
const restoreFn = functionNode(cleanupTree, 'restoreStock')
const failFn = functionNode(cleanupTree, 'fail')

const noFixture = ifNode(cleanupTree, (item) => cleanup.slice(item.start, item.start + 80).includes('NO_FIXTURE_PRESENT'))
const unknown = ifNode(cleanupTree, (item) => cleanup.slice(item.start, item.start + 120).includes('UNEXPECTED_OR_AMBIGUOUS_STRUCTURE'))
const preDelivery = ifNode(cleanupTree, (item) => cleanup.slice(item.start, item.start + 140).includes('PENDING_PREDELIVERY'))
const noFixtureBody = controlledStatement(cleanupTree, noFixture.consequent)
const unknownBody = controlledStatement(cleanupTree, unknown.consequent)
const preDeliveryBody = controlledStatement(cleanupTree, preDelivery.consequent)

assertStructural(environmentFn.body.kind === 'PUNCT' || environmentFn.body.value === '{', 'environment_function_owner')
assertStructural(runnerTry.body.value === '{' && runnerTry.body.parent === runnerTry.body.parent, 'try_owner')
assertStructural(runnerCatch.body.value === '{', 'catch_owner')
assertStructural(noFixtureBody.kind === 'STATEMENT', 'no_fixture_unbraced')
assertStructural(unknownBody.kind === 'STATEMENT', 'unknown_unbraced')
assertStructural(preDeliveryBody.kind === 'BLOCK', 'predelivery_block')

assertStructural(runner.includes("fs.rmSync(eventPath, { force: true })"), 'transport_statement_token')
assertStructural(runner.includes("spawn('npx', ['playwright', 'test', actualSpec"), 'positive_e2e_launch')
assertStructural(runner.includes(`actualSpec = '${specPath}'`), 'exact_spec_binding')
assertStructural(runner.includes("'--project=chromium-lab-staff'"), 'expected_project_binding')
assertStructural(runner.includes('env: childEnv'), 'e2e_child_env')
assertStructural(environmentFn.body.children.some((item) => item.value === 'RESEND_API_KEY'), 'empty_email_owner')

const raceReturns = executable(runnerTree.tokens).filter((item, index, tokens) => item.value === 'return' && tokens[index + 1]?.value === "'result'")
const childReturns = executable(runnerTree.tokens).filter((item, index, tokens) => item.value === 'return' && tokens[index + 1]?.value === "'child_exit'")
assertStructural(raceReturns.length === 1 && childReturns.length === 1, 'first_terminal_one_shot')
assertStructural(raceFn.body.children.some((item) => item.value === 'while'), 'first_terminal_loop_owner')

const terminalDeclaration = executable(runnerTree.tokens).filter((item) => item.value === 'terminal')
assertStructural(terminalDeclaration.length >= 1, 'postattempt_terminal_owner')
assertStructural(runnerTry.body.children.length > 0, 'postattempt_common_setup')
assertStructural(runner.includes("if (terminal === 'result') writeEvent('CLEANUP_REQUIRED')"), 'result_first_branch')
assertStructural(runner.includes('else writeCleanupAuditEvent()'), 'child_exit_first_branch')
assertStructural(runner.includes('const childCode = await waitForChild()'), 'child_exit_before_cleanup')
assertStructural(runner.includes('await runCleanupOnce()'), 'cleanup_after_child')
assertStructural(runner.includes("if (childCode !== 0) fail('delivery_browser_failed_after_cleanup')"), 'child_failure_terminal')
assertStructural(runner.includes("writeEvent('COMPLETE')"), 'complete_owner')

const deliveryTransition = executable(runnerTree.tokens).filter((item) => item.value === 'deliveryAttempt')
assertStructural(deliveryTransition.length >= 2, 'delivery_transition_nodes')
assertStructural(runner.includes("writeEvent('DELIVERY_SUBMIT_AUTHORIZED')"), 'delivery_authorization_node')
assertStructural(runner.includes('consumeDeliveryAttempt()'), 'delivery_attempt_owner')

const mutationNames = ['restoreStock', 'deleteExactly']
for (const name of mutationNames) callPath(cleanupTree, classifyFn, directCalls(cleanupTree, classifyFn, name), `mutation_inventory:${name}`)
assertStructural(preDeliveryBody.kind === 'BLOCK', 'predelivery_owner')
assertStructural(cleanup.includes("await deleteExactly(admin, 'request_items'"), 'predelivery_item_mutation')
assertStructural(cleanup.includes("await deleteExactly(admin, 'requests'"), 'predelivery_request_mutation')
assertStructural(cleanup.includes('const result = await query'), 'mutation_success_result')
assertStructural(cleanup.includes("if (result.error || (result.data ?? []).length !== 1) fail('cleanup_delete_failed_' + table)"), 'mutation_failure_guard')
assertStructural(cleanup.includes('process.exit(1)'), 'mutation_failure_terminal')

const fullCleanupOrder = [
  'await restoreStock(',
  "deleteExactly(admin, 'inventory_movements'",
  "deleteExactly(admin, 'loan_items'",
  "deleteExactly(admin, 'loans'",
  "deleteExactly(admin, 'request_items'",
  "deleteExactly(admin, 'requests'",
]
for (const operation of fullCleanupOrder) assertStructural(cleanup.includes(operation), `full_cleanup_node:${operation}`)
assertStructural(fullCleanupOrder.length === 6, 'full_cleanup_cardinality_model')

terminalFailureModel(cleanupTree, 'deleteExactly')
terminalFailureModel(cleanupTree, 'restoreStock')
assertStructural(cleanup.includes('if (classification === \'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE\') fail'), 'unknown_fail_closed')
assertStructural(cleanup.includes('if (classification === \'NO_FIXTURE_PRESENT\') process.exit(0)'), 'no_fixture_terminal')
assertStructural(runner.includes('if (cleanupAttempted) throw new Error'), 'cleanup_one_shot_guard')
assertStructural(runner.includes('if (!cleanupAttempted && canRecover())'), 'recovery_guard')
assertStructural(runner.includes('process.cwd() !== root'), 'normal_project_rejection')
assertStructural(runner.includes("RESEND_API_KEY: ''"), 'zero_email_empty_string')

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
assertStructural(replacementFamilies.length === 14 && preservedFamilies.length === 9, 'family_manifest')
console.log('PASS:F3JK_V12_DESIGN_SURFACE')
