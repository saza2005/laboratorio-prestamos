import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('/home/saza/Proyectos/laboratorio-prestamos-e2e')
const runnerPath = path.join(root, 'scripts/e2e/run-flow-l1-b-delivery-v3.mjs')
const specPath = path.join(root, 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts')
const cleanupPath = path.join(root, 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs')
const runner = read(runnerPath)
const spec = read(specPath)
const cleanup = read(cleanupPath)

assertHash(runnerPath, '242903f4a2e4414c720e32150b77d31065f2e93e6869115238be8eedde15fc74')
assertHash(specPath, '781f498a12cd8ad8045c9a57ff37417ce91f1e683a5962b060f3141da08feef7')
assertHash(cleanupPath, '1bf5f5d8e69cf4b463804f67e0fce28f1f35f454d1faa10685a6c1fea55359d0')

const mainTry = extractBlockAfter(runner, 'try {\n  await waitForHandshake')
const errorCatch = extractBlockAfter(runner, '} catch (error) {')
const resultRace = extractFunction(runner, 'async function waitForResultOrChildExit()')
const cleanupOnce = extractFunction(runner, 'async function runCleanupOnce()')
const childEnv = extractFunction(runner, 'function makeBrowserEnvironment(id, capture)')
const consumeAttempt = extractFunction(runner, 'function consumeDeliveryAttempt()')
const classify = extractFunction(cleanup, 'function classify(graph, state)')
const cleanupDispatch = extractBlockAfter(cleanup, "if (classification === 'NO_FIXTURE_PRESENT')")
const preDelivery = extractRegion(cleanup, "if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY')", 'await restoreStock')
const fullDelivery = extractRegion(cleanup, 'await restoreStock', "console.log('L1_DELIVERY_CLEANUP_V2_SEQUENCE")

assert(runner.includes("const actualSpec = 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'"), 'runner binding missing')
assert(runner.includes("const cleanupPath = 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'"), 'cleanup binding missing')
for (const forbidden of ['cleanup-l1-fixture.mjs', 'cleanup-l1-delivery-fixture.mjs\'', 'cleanup-l1-delivery-fixture-v3.mjs', 'cleanup-l1-delivery-fixture-v4.mjs', 'cleanup-l1-delivery-fixture-v5.mjs']) assert(!runner.includes(forbidden), 'forbidden runtime cleanup target')

const eventTransportInit = runner.indexOf('fs.rmSync(eventPath, { force: true })')
const childLaunch = runner.indexOf("spawn('npx'")
assert(eventTransportInit >= 0 && eventTransportInit < childLaunch, 'event transport initialization is not before child launch')
assert(!runner.includes("writeEvent('BROWSER_READY'"), 'runner emits BROWSER_READY')
assert(spec.includes("writeEvent('BROWSER_READY')"), 'spec does not own BROWSER_READY')
assert(runner.includes("waitForHandshake('BROWSER_READY')"), 'runner does not wait for BROWSER_READY')

assert(resultRace.includes("if (state === 'DELIVERY_RESULT_OBSERVED') return 'result'"), 'result terminal is missing')
assert(resultRace.includes("if (child.exitCode !== null) return 'child_exit'"), 'child-exit terminal is missing')
assert(resultRace.includes('while (Date.now() < deadline)'), 'result race is not a bounded single loop')
assert(resultRace.includes("fail('delivery_result_or_child_exit_timeout')"), 'race timeout is not fail closed')
assert(count(mainTry, 'const terminal = await waitForResultOrChildExit()') === 1, 'postattempt settlement is entered more than once')
assert(scopedSequence(mainTry, 'const terminal = await waitForResultOrChildExit()', "if (terminal === 'result') writeEvent('CLEANUP_REQUIRED')", 'const childCode = await waitForChild()'), 'result-first branch is not scoped')
assert(!mainTry.includes("if (state === 'DELIVERY_SUBMIT_ATTEMPTED') writeEvent('CLEANUP_REQUIRED')"), 'early cleanup path remains')
assert(mainTry.includes('else writeCleanupAuditEvent()'), 'child-exit-first audit branch is missing')
assert(mainTry.includes('await runCleanupOnce()'), 'normal cleanup invocation is missing')
assert(cleanupOnce.includes("if (cleanupAttempted) throw new Error('cleanup_retry_forbidden')"), 'cleanup max-one guard is missing')
assert(scopedSequence(errorCatch, 'if (!cleanupAttempted && canRecover())', 'await runCleanupOnce()'), 'error cleanup is not settlement guarded')
assert(!errorCatch.includes("writeEvent('COMPLETE')"), 'error handler emits COMPLETE')

assert(scopedSequence(consumeAttempt, 'deliveryAttempt !== 0', 'deliveryAttempt: 1'), 'delivery attempt consumption is not one-shot')
assert(scopedSequence(mainTry, 'consumeDeliveryAttempt()', "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')"), 'authorization precedes attempt consumption')
assert(count(mainTry, "writeEvent('DELIVERY_SUBMIT_AUTHORIZED')") === 1, 'authorization has multiple paths')
assert(!/deliveryAttempt\s*:\s*0/.test(runner), 'runner resets delivery attempt')
assert(runner.includes('--retries=0') && !/delivery\s*retry/i.test(runner), 'delivery retry path present')

assert(childEnv.includes("RESEND_API_KEY: ''"), 'child environment does not explicitly disable email')
assert(runner.includes('env: childEnv'), 'Playwright does not receive constructed child environment')
assert(!runner.includes('delete process.env.RESEND_API_KEY') && !runner.includes('delete childEnv.RESEND_API_KEY'), 'email key is unset instead of explicitly empty')
assert(!runner.includes('console.log(process.env') && !runner.includes('console.log(childEnv.RESEND_API_KEY'), 'secret logging path present')

const stateNames = ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']
for (const state of stateNames) assert(cleanup.includes(state), 'cleanup state missing: ' + state)
assert(scopedSequence(cleanup, 'const classification = classify(graph, snapshot)', "if (classification === 'NO_FIXTURE_PRESENT')"), 'classification does not precede dispatch')
assert(scopedSequence(cleanupDispatch, "if (classification === 'NO_FIXTURE_PRESENT') process.exit(0)", "if (classification === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE') fail('unexpected_or_ambiguous_structure')", "if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY')"), 'top-level cleanup dispatch is not mutually exclusive')
assert(classify.includes("return 'PENDING_PREDELIVERY'") && classify.includes("return 'APPROVED_PREDELIVERY'"), 'pre-delivery classifier states missing')
assert(classify.includes("return full ? 'FULLY_DELIVERED_MINIMAL_BULK' : 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE'"), 'full/unknown classifier boundary missing')

assert(countCalls(preDelivery) === 2, 'pre-delivery cardinality is not two')
assert(scopedSequence(preDelivery, "deleteExactly(admin, 'request_items'", "deleteExactly(admin, 'requests'"), 'pre-delivery order is invalid')
assert(preDelivery.includes('process.exit(0)'), 'pre-delivery branch does not terminate successfully')
assert(countCalls(fullDelivery) === 5, 'full branch does not contain five delete sites')
assert(fullDelivery.includes('await restoreStock'), 'full branch stock restoration is missing')
assert(scopedSequence(fullDelivery, "deleteExactly(admin, 'inventory_movements'", "deleteExactly(admin, 'loan_items'", "deleteExactly(admin, 'loans'", "deleteExactly(admin, 'request_items'", "deleteExactly(admin, 'requests'"), 'full-delivery mutation order is invalid')
assert(scopedSequence(cleanupDispatch, "if (classification === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE') fail('unexpected_or_ambiguous_structure')", "if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY')"), 'unknown state can reach mutation dispatch')
assert(cleanup.includes('graph.requestGroups.length === 0') && cleanup.includes('graph.loanGroups.length === 0') && cleanup.includes('graph.units.length === 0') && cleanup.includes('graph.returns.length === 0'), 'forbidden graph guards missing')

assert(!/readWithBoundedRetry|retry/i.test(cleanup), 'cleanup retry helper or loop present')
assert(!cleanup.includes('cleanup-l1-fixture.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture-v3.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture-v4.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture-v5.mjs'), 'cleanup fallback target present')
assert(cleanup.includes('function fail(code)') && cleanup.includes('process.exit(1)'), 'cleanup fail-closed termination missing')
assert(!/catch\s*\([^)]*\)\s*\{[^}]*deleteExactly/s.test(cleanup) && !/finally\s*\{[^}]*deleteExactly/s.test(cleanup), 'cleanup failure can reenter mutation')
assert(scopedSequence(cleanupOnce, 'cleanupAttempted = true', 'execFileSync', 'clearRecoveryState()'), 'cleanup success dependency is not explicit')

assert(runner.includes('process.cwd() !== root') && runner.includes('process.loadEnvFile(\'.env.e2e\')') && runner.includes('E2E_EXPECTED_PROJECT_REF'), 'E2E isolation contract missing')
assert(!runner.includes('deliverRequestWithState') && !runner.includes('deliver_approved_request_with_units'), 'production implementation altered in runtime artifact')

console.log('L1_F3IS_V5_CONTRACT: PASS')

function read(file) { if (!fs.existsSync(file)) fail('missing_artifact'); return fs.readFileSync(file, 'utf8') }
function assertHash(file, expected) { const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); if (actual !== expected) fail('artifact_hash_mismatch') }
function count(source, value) { return source.split(value).length - 1 }
function countCalls(source) { return count(source, 'deleteExactly(admin,') }
function extractFunction(source, signature) { return extractBlockAfter(source, signature) }
function extractBlockAfter(source, marker) { const markerAt = source.indexOf(marker); if (markerAt < 0) fail('scope_marker_missing'); const open = source.indexOf('{', markerAt); if (open < 0) fail('scope_open_missing'); const close = matchingBrace(source, open); return source.slice(open, close + 1) }
function extractRegion(source, start, end) { const first = source.indexOf(start); const last = source.indexOf(end, first + start.length); if (first < 0 || last < 0) fail('region_marker_missing'); return source.slice(first, last) }
function matchingBrace(source, open) {
  let depth = 0; let quote = null; let lineComment = false; let blockComment = false
  for (let i = open; i < source.length; i += 1) {
    const c = source[i]; const n = source[i + 1]
    if (lineComment) { if (c === '\n') lineComment = false; continue }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1 } continue }
    if (quote) { if (c === '\\') { i += 1; continue } if (c === quote) quote = null; continue }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue }
    if (c === '{') depth += 1
    if (c === '}' && --depth === 0) return i
  }
  fail('unbalanced_scope')
}
function scopedSequence(source, ...parts) { let at = -1; for (const part of parts) { const next = source.indexOf(part, at + 1); if (next < 0) return false; at = next } return true }
function fail(message) { console.error('L1_F3IS_V5_CONTRACT: FAIL\nCATEGORY: ' + message); process.exit(1) }
