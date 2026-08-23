import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('/home/saza/Proyectos/laboratorio-prestamos-e2e')
const runnerPath = path.join(root, 'scripts/e2e/run-flow-l1-b-delivery-v3.mjs')
const cleanupPath = path.join(root, 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs')
const specPath = path.join(root, 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts')
const runner = read(runnerPath)
const cleanup = read(cleanupPath)
const spec = read(specPath)
const handshake = ['BROWSER_READY', 'FIXTURE_READY', 'ACTION_ARMED', 'INITIAL_CONFIRMATION_TRIGGERED', 'FINAL_DELIVERY_ARMED', 'EMAIL_PROVIDER_DISABLED_PROVEN', 'DELIVERY_SUBMIT_AUTHORIZED', 'DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED', 'CLEANUP_REQUIRED', 'COMPLETE']
const cleanupStates = ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']

assert(runner.includes('tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts'), 'actual spec binding missing')
assert(runner.includes("const cleanupPath = 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs'"), 'cleanup v2 binding missing')
assert(!runner.includes('cleanup-l1-fixture.mjs'), 'historical cleanup target forbidden')
assert(!runner.includes('cleanup-l1-delivery-fixture.mjs\''), 'F3IG cleanup target forbidden')
assert(!runner.includes('cleanup-l1-delivery-fixture-v3.mjs'), 'cleanup v3 target forbidden')
assert(!runner.includes("writeEvent('BROWSER_READY'"), 'runner browser-ready emission forbidden')
assert(runner.includes('fs.rmSync(eventPath, { force: true })'), 'stateful transport initialization detected')
assert(runner.includes("waitForHandshake('BROWSER_READY')"), 'spec browser-ready wait missing')
assert(runner.includes('waitForResultOrChildExit') && runner.includes("if (state === 'DELIVERY_RESULT_OBSERVED') return 'result'") && runner.includes('if (child.exitCode !== null) return \'child_exit\''), 'result-or-child-exit race missing')
assert(ordered(runner, "const terminal = await waitForResultOrChildExit()", "if (terminal === 'result') writeEvent('CLEANUP_REQUIRED')", 'await waitForChild()', 'await runCleanupOnce()', "writeEvent('COMPLETE')"), 'normal result lifecycle invalid')
assert(runner.includes('writeCleanupAuditEvent'), 'child-exit audit path missing')
assert(runner.includes("RESEND_API_KEY: ''"), 'explicit empty provider key missing')
assert(!runner.includes('delete process.env.RESEND_API_KEY') && !runner.includes('delete childEnv.RESEND_API_KEY'), 'provider key unset strategy forbidden')
assert(runner.includes('deliveryAttempt') && runner.includes("DELIVERY_SUBMIT_AUTHORIZED"), 'delivery attempt guard missing')
assert(runner.includes('--retries=0') && runner.includes('cleanup_retry_forbidden'), 'no-retry guard missing')
assert(runner.includes('cleanupAttempted') && runner.includes('if (cleanupAttempted)'), 'cleanup cardinality guard missing')
for (const state of handshake) assert(runner.includes(state) || spec.includes(state), `handshake state missing: ${state}`)
assert(spec.includes("writeEvent('BROWSER_READY')") && spec.includes("writeEvent('DELIVERY_RESULT_OBSERVED')") && spec.includes("await waitForEvent('CLEANUP_REQUIRED')"), 'spec lifecycle contract missing')

for (const state of cleanupStates) assert(cleanup.includes(state), `cleanup state missing: ${state}`)
assert(ordered(cleanup, 'const classification = classify', 'if (classification ===', "await deleteExactly(admin, 'request_items'", "await deleteExactly(admin, 'requests'"), 'classification/mutation order invalid')
assert(ordered(cleanup, 'await restoreStock', "await deleteExactly(admin, 'inventory_movements'", "await deleteExactly(admin, 'loan_items'", "await deleteExactly(admin, 'loans'", "await deleteExactly(admin, 'request_items'", "await deleteExactly(admin, 'requests'"), 'full cleanup order invalid')
assert(cleanup.includes("return 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE'") && cleanup.includes("process.exit(1)"), 'unknown fail-closed path missing')
assert(cleanup.includes('graph.requestGroups.length === 0') && cleanup.includes('graph.loanGroups.length === 0') && cleanup.includes('graph.units.length === 0') && cleanup.includes('graph.returns.length === 0'), 'forbidden graph guards missing')
assert(!cleanup.includes('readWithBoundedRetry') && !cleanup.includes('retry') && !cleanup.includes('cleanup-l1-fixture.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture-v3.mjs'), 'cleanup retry/fallback contract violated')
assert(count(cleanup, "deleteExactly(admin, '") === 6, 'full mutation site count not six')
assert(count(cleanup, 'process.exit(0)') === 2, 'success termination branches changed')
assert(cleanup.includes('function fail(code)') && cleanup.includes('process.exit(1)'), 'cleanup failure termination missing')

assert(ordered(runner, "if (terminal === 'result') writeEvent('CLEANUP_REQUIRED')", 'await waitForChild()', 'await runCleanupOnce()', "writeEvent('COMPLETE')"), 'complete ordering missing')
assert(runner.includes('delivery_result_or_child_exit_timeout'), 'race timeout fail closed missing')
assert(runner.includes('deliveryAttempt !== 0') && runner.includes('deliveryAttempt: 1'), 'delivery one-shot transition missing')
assert(runner.includes('E2E_EXPECTED_PROJECT_REF') && runner.includes('process.cwd() !== root'), 'E2E isolation missing')
assert(!runner.includes('console.log(process.env') && !runner.includes('console.log(childEnv.RESEND_API_KEY'), 'secret logging path detected')

console.log('L1_F3IO_V3_CONTRACT: PASS')

function read(file) { if (!fs.existsSync(file)) fail('missing_artifact'); return fs.readFileSync(file, 'utf8') }
function count(source, value) { return source.split(value).length - 1 }
function ordered(source, ...parts) { let at = -1; for (const part of parts) { const next = source.indexOf(part, at + 1); if (next < 0) return false; at = next } return true }
function assert(condition, message) { if (!condition) fail(message) }
function fail(message) { console.error('L1_F3IO_V3_CONTRACT: FAIL\nCATEGORY: ' + message); process.exit(1) }
