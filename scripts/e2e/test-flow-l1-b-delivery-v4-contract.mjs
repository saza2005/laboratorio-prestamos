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

assert(runner.includes("const actualSpec = 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'"), 'runner/spec binding missing')
assert(runner.includes("const cleanupPath = 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'"), 'runner/cleanup binding missing')
for (const forbidden of ['cleanup-l1-fixture.mjs', 'cleanup-l1-delivery-fixture.mjs\'', 'cleanup-l1-delivery-fixture-v3.mjs', 'cleanup-l1-delivery-fixture-v4.mjs']) assert(!runner.includes(forbidden), 'forbidden cleanup runtime target: ' + forbidden)

assert(!runner.includes("writeEvent('BROWSER_READY'"), 'runner owns BROWSER_READY')
assert(runner.includes('fs.rmSync(eventPath, { force: true })'), 'event transport is not initialized empty')
assert(runner.includes("waitForHandshake('BROWSER_READY')"), 'runner does not wait for spec BROWSER_READY')
assert(spec.includes("writeEvent('BROWSER_READY')"), 'spec does not emit BROWSER_READY')
assert(spec.includes("writeEvent('DELIVERY_SUBMIT_ATTEMPTED')") && spec.includes("writeEvent('DELIVERY_RESULT_OBSERVED')"), 'spec delivery events missing')

assert(runner.includes('waitForResultOrChildExit'), 'postattempt settlement function missing')
assert(runner.includes("if (state === 'DELIVERY_RESULT_OBSERVED') return 'result'"), 'result terminal missing')
assert(runner.includes("if (child.exitCode !== null) return 'child_exit'"), 'child-exit terminal missing')
assert(ordered(runner, 'const terminal = await waitForResultOrChildExit()', "if (terminal === 'result') writeEvent('CLEANUP_REQUIRED')", 'await waitForChild()', 'await runCleanupOnce()', "writeEvent('COMPLETE')"), 'result-first lifecycle is not ordered')
assert(!runner.includes("if (state === 'DELIVERY_SUBMIT_ATTEMPTED') writeEvent('CLEANUP_REQUIRED')"), 'early cleanup path present')
assert(runner.includes('writeCleanupAuditEvent'), 'child-exit audit path missing')
assert(count(runner, 'const terminal = await waitForResultOrChildExit()') === 1, 'postattempt settlement can be entered more than once')
assert(runner.includes('cleanupAttempted') && runner.includes("if (cleanupAttempted) throw new Error('cleanup_retry_forbidden')"), 'cleanup single-settlement guard missing')
assert(ordered(runner, 'if (!cleanupAttempted && canRecover())', 'await runCleanupOnce()'), 'failure cleanup is not guarded by settlement state')
assert(runner.includes("RESEND_API_KEY: ''") && !runner.includes('delete process.env.RESEND_API_KEY') && !runner.includes('delete childEnv.RESEND_API_KEY'), 'email isolation contract invalid')
assert(runner.includes('deliveryAttempt !== 0') && runner.includes('deliveryAttempt: 1') && runner.includes("DELIVERY_SUBMIT_AUTHORIZED"), 'delivery one-shot contract missing')
assert(runner.includes('--retries=0') && !/delivery\s*retry/i.test(runner), 'delivery retry contract invalid')
assert(ordered(runner, 'await runCleanupOnce()', "if (childCode !== 0) fail('delivery_browser_failed_after_cleanup')", "writeEvent('COMPLETE')"), 'COMPLETE is not downstream of cleanup success')
assert(!runner.includes('writeEvent(\'COMPLETE\')\n} catch'), 'COMPLETE has an unguarded failure path')
assert(runner.includes('canRecover()') && runner.includes('child.kill(\'SIGTERM\')'), 'child-failure recovery path missing')

const states = ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']
for (const state of states) assert(cleanup.includes(state), 'cleanup state missing: ' + state)
assert(ordered(cleanup, 'const classification = classify', 'if (classification ===', 'await deleteExactly'), 'classification does not precede mutation')
assert(cleanup.includes("if (classification === 'NO_FIXTURE_PRESENT') process.exit(0)"), 'no-fixture branch is not zero-mutation terminal')
assert(cleanup.includes("if (classification === 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE') fail('unexpected_or_ambiguous_structure')"), 'unknown branch is not fail closed')
assert(cleanup.includes("if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY')"), 'shared pre-delivery dispatch missing')

const preDeliveryRegion = between(cleanup, "if (classification === 'PENDING_PREDELIVERY' || classification === 'APPROVED_PREDELIVERY')", 'await restoreStock')
assert(countCalls(preDeliveryRegion) === 2, 'pre-delivery branch must contain exactly two delete sites')
assert(ordered(preDeliveryRegion, "deleteExactly(admin, 'request_items'", "deleteExactly(admin, 'requests'"), 'pre-delivery mutation order invalid')
assert(preDeliveryRegion.includes('process.exit(0)'), 'pre-delivery branch does not terminate after success')

const fullRegion = between(cleanup, 'await restoreStock', "console.log('L1_DELIVERY_CLEANUP_V2_SEQUENCE")
assert(fullRegion.includes('await restoreStock'), 'full branch stock restoration missing')
assert(countCalls(fullRegion) === 5, 'full branch must contain five delete sites')
assert(ordered(fullRegion, "deleteExactly(admin, 'inventory_movements'", "deleteExactly(admin, 'loan_items'", "deleteExactly(admin, 'loans'", "deleteExactly(admin, 'request_items'", "deleteExactly(admin, 'requests'"), 'full branch mutation order invalid')
assert(fullRegion.includes('restoreStock'), 'full branch semantic mutation count is not six')

const classifierRegion = between(cleanup, 'function classify', 'async function restoreStock')
assert(classifierRegion.includes("return 'NO_FIXTURE_PRESENT'") || cleanup.includes("classification === 'NO_FIXTURE_PRESENT'"), 'no-fixture classifier missing')
assert(classifierRegion.includes("return 'PENDING_PREDELIVERY'") && classifierRegion.includes("return 'APPROVED_PREDELIVERY'"), 'pre-delivery classifier states missing')
assert(classifierRegion.includes("return full ? 'FULLY_DELIVERED_MINIMAL_BULK' : 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE'"), 'full/unknown classifier boundary missing')
assert(cleanup.includes('graph.requestGroups.length === 0') && cleanup.includes('graph.loanGroups.length === 0') && cleanup.includes('graph.units.length === 0') && cleanup.includes('graph.returns.length === 0'), 'forbidden graph guards missing')

assert(!/readWithBoundedRetry|retry/i.test(cleanup), 'cleanup retry helper or loop present')
assert(!cleanup.includes('cleanup-l1-fixture.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture-v3.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture-v4.mjs'), 'cleanup fallback target present')
assert(cleanup.includes("process.exit(1)") && cleanup.includes('function fail(code)'), 'cleanup failure termination missing')
assert(!/catch\s*\([^)]*\)\s*\{[^}]*deleteExactly/s.test(cleanup), 'cleanup catch reexecutes mutation')
assert(!/finally\s*\{[^}]*deleteExactly/s.test(cleanup), 'cleanup finally mutates remotely')

assert(runner.includes('E2E_EXPECTED_PROJECT_REF') && runner.includes('process.cwd() !== root'), 'E2E isolation missing')
assert(!runner.includes('console.log(process.env') && !runner.includes('console.log(childEnv.RESEND_API_KEY'), 'secret logging path present')
console.log('L1_F3IQ_V4_CONTRACT: PASS')

function read(file) { if (!fs.existsSync(file)) fail('missing_artifact'); return fs.readFileSync(file, 'utf8') }
function assertHash(file, expected) { const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); if (actual !== expected) fail('artifact_hash_mismatch') }
function count(source, value) { return source.split(value).length - 1 }
function countCalls(source) { return count(source, 'deleteExactly(admin,') }
function between(source, start, end) { const first = source.indexOf(start); const last = source.indexOf(end, first + start.length); if (first < 0 || last < 0) fail('scoped_region_missing'); return source.slice(first, last) }
function ordered(source, ...parts) { let at = -1; for (const part of parts) { const next = source.indexOf(part, at + 1); if (next < 0) return false; at = next } return true }
function fail(message) { console.error('L1_F3IQ_V4_CONTRACT: FAIL\nCATEGORY: ' + message); process.exit(1) }
