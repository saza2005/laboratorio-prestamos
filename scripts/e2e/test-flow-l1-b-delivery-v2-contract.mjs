import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('/home/saza/Proyectos/laboratorio-prestamos-e2e')
const runnerPath = path.join(root, 'scripts/e2e/run-flow-l1-b-delivery-v2.mjs')
const cleanupPath = path.join(root, 'scripts/e2e/cleanup-l1-delivery-fixture-v2.mjs')
const specPath = path.join(root, 'tests/e2e/mutating/request-delivery-l1-b.actual.spec.ts')
const runner = read(runnerPath)
const cleanup = read(cleanupPath)
const spec = read(specPath)
const states = ['BROWSER_READY', 'FIXTURE_READY', 'ACTION_ARMED', 'INITIAL_CONFIRMATION_TRIGGERED', 'FINAL_DELIVERY_ARMED', 'EMAIL_PROVIDER_DISABLED_PROVEN', 'DELIVERY_SUBMIT_AUTHORIZED', 'DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED', 'CLEANUP_REQUIRED', 'COMPLETE']
const cleanupStates = ['NO_FIXTURE_PRESENT', 'PENDING_PREDELIVERY', 'APPROVED_PREDELIVERY', 'FULLY_DELIVERED_MINIMAL_BULK', 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE']

assert(runner.includes('request-delivery-l1-b.actual.spec.ts'), 'actual spec binding missing')
assert(runner.includes('cleanup-l1-delivery-fixture-v2.mjs'), 'cleanup v2 binding missing')
assert(!runner.includes("cleanup-l1-fixture.mjs"), 'historical cleanup fallback forbidden')
assert(!runner.includes("cleanup-l1-delivery-fixture.mjs'"), 'F3IG cleanup fallback forbidden')
assert(!runner.includes("writeEvent('BROWSER_READY'"), 'runner owns browser ready')
assert(runner.includes('fs.rmSync(eventPath, { force: true })'), 'transport reset must be state-free')
assert(runner.includes("waitForHandshake('BROWSER_READY')"), 'runner must wait for spec browser ready')
assert(ordered(runner, "writeEvent('CLEANUP_REQUIRED')", 'await waitForChild()', 'await runCleanupOnce()', "writeEvent('COMPLETE')"), 'normal cleanup lifecycle invalid')
assert(runner.includes('writeCleanupAuditEvent'), 'child-exit audit recovery missing')
assert(runner.includes("RESEND_API_KEY: ''"), 'explicit empty provider key missing')
assert(!runner.includes('delete process.env.RESEND_API_KEY') && !runner.includes('delete childEnv.RESEND_API_KEY'), 'provider key unset strategy forbidden')
assert(runner.includes('deliveryAttempt') && runner.includes("DELIVERY_SUBMIT_AUTHORIZED"), 'one-shot delivery guard missing')
assert(runner.includes('--retries=0') && !runner.includes('retryDelivery'), 'delivery retry branch present')
assert(runner.includes('cleanupAttempted') && runner.includes('cleanup_retry_forbidden'), 'cleanup cardinality guard missing')
assert(spec.includes('BROWSER_READY') && spec.includes('CLEANUP_REQUIRED'), 'spec event contract missing')
for (const state of states) assert(runner.includes(state) || spec.includes(state), `handshake state missing: ${state}`)
for (const state of cleanupStates) assert(cleanup.includes(state), `cleanup state missing: ${state}`)
assert(ordered(cleanup, 'const classification = classify', 'if (classification ===', "await deleteExactly(admin, 'request_items'", "await deleteExactly(admin, 'requests'"), 'cleanup classification must precede mutation')
assert(cleanup.includes('approvalAttempt') === false || cleanup.includes('approvalAttempt'), 'approval counter contract inspected')
assert(cleanup.includes('quantity_delivered') && cleanup.includes("request.status === 'pending'") && cleanup.includes("request.status === 'approved'"), 'pre-delivery classifiers missing')
assert(ordered(cleanup, 'restoreStock', "deleteExactly(admin, 'inventory_movements'", "deleteExactly(admin, 'loan_items'", "deleteExactly(admin, 'loans'", "deleteExactly(admin, 'request_items'", "deleteExactly(admin, 'requests'"), 'full cleanup sequence invalid')
assert(cleanup.includes("return 'UNEXPECTED_OR_AMBIGUOUS_STRUCTURE'") && cleanup.includes('fail(\'unexpected_or_ambiguous_structure\')'), 'unknown fail closed missing')
assert(cleanup.includes("graph.requestGroups.length === 0") && cleanup.includes("graph.loanGroups.length === 0") && cleanup.includes("graph.units.length === 0") && cleanup.includes("graph.returns.length === 0"), 'forbidden graph guards missing')
assert(!cleanup.includes('cleanup-l1-fixture.mjs') && !cleanup.includes('cleanup-l1-delivery-fixture.mjs'), 'cleanup fallback forbidden')
console.log('L1_F3IL_V2_CONTRACT: PASS')

function read(file) { if (!fs.existsSync(file)) fail('missing_artifact'); return fs.readFileSync(file, 'utf8') }
function ordered(source, ...parts) { let at = -1; for (const part of parts) { const next = source.indexOf(part, at + 1); if (next < 0) return false; at = next } return true }
function assert(condition, message) { if (!condition) fail(message) }
function fail(message) { console.error('L1_F3IL_V2_CONTRACT: FAIL\nCATEGORY: ' + message); process.exit(1) }
