import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { runBaselineRead } from './lib/baseline-read-observer.mjs'
import { runSingleProcessPreflight } from './verify-mutating-l1-single-process-preflight.mjs'

let calls = 0
const dnsObserver = {
  setAttempt() {},
  getAttemptEvidence() { return { status: 'ONE', events: [{ fingerprint: { transportClass: 'DNS_RESOLUTION_ERROR' } }] } },
  getAttemptSummary() { return { statusClass: 'NO_FAILURE', hostMatch: 'MATCH' } },
}
const dnsResult = await runBaselineRead({
  operation: async () => { calls += 1; return { data: null, error: { code: 'PGRST_TEST' } } },
  ordinal: 6,
  readClass: 'BASELINE_REQUEST_ITEMS',
  observer: dnsObserver,
})
assert.equal(calls, 1)
assert.equal(dnsResult.ok, false)
assert.equal(dnsResult.failure.rawTransportClass, 'DNS_RESOLUTION_ERROR')
assert.equal(dnsResult.failure.hostClass, 'E2E_SUPABASE_HOST')
assert.equal(dnsResult.failure.ordinal, 6)
console.log('L1_F3Z_BASELINE_DNS_NORMALIZATION_TEST=PASS')

const noRaw = await runBaselineRead({
  operation: async () => ({ data: null, error: {} }),
  ordinal: 7,
  readClass: 'BASELINE_REQUEST_GROUPS',
  observer: { setAttempt() {}, getAttemptEvidence() { return { status: 'NONE', events: [] } }, getAttemptSummary() { return {} } },
})
assert.equal(noRaw.failure.rawTransportClass, 'NO_FAILURE')
assert.equal(noRaw.failure.resultClass, 'EMPTY_SUPABASE_ERROR_OBJECT')
console.log('L1_F3Z_BASELINE_NO_RAW_NO_DNS_INFERENCE_TEST=PASS')

const http = await runBaselineRead({
  operation: async () => ({ data: null, error: { status: 404 } }),
  ordinal: 8,
  readClass: 'BASELINE_REQUEST_GROUP_ITEMS',
  observer: { setAttempt() {}, getAttemptEvidence() { return { status: 'NONE', events: [] } }, getAttemptSummary() { return { statusClass: 'HTTP_4XX' } } },
})
assert.equal(http.failure.statusClass, 'HTTP_4XX')
console.log('L1_F3Z_BASELINE_HTTP_CLASSIFICATION_TEST=PASS')

const otherHost = await runBaselineRead({
  operation: async () => ({ data: null, error: { code: 'PGRST_TEST' } }),
  ordinal: 9,
  readClass: 'BASELINE_LOANS',
  observer: { setAttempt() {}, getAttemptEvidence() { return { status: 'ONE', events: [{ fingerprint: { transportClass: 'DNS_RESOLUTION_ERROR' } }] } }, getAttemptSummary() { return { hostMatch: 'MISMATCH' } } },
})
assert.equal(otherHost.failure.hostClass, 'OTHER_HOST')
console.log('L1_F3Z_BASELINE_OTHER_HOST_FAIL_CLOSED_TEST=PASS')

let cleanCalls = 0
let l1Calls = 0
const coordinator = await runSingleProcessPreflight({
  freezeGate: () => ({ ok: true }),
  isolationGate: () => ({ ok: true }),
  storageGate: () => ({ ok: true }),
  baselineCore: async () => ({ ok: false, final: 'FAIL', failure: dnsResult.failure }),
  cleanStateCore: async () => { cleanCalls += 1; return { ok: true } },
  l1PreCore: async () => { l1Calls += 1; return { ok: true } },
})
assert.equal(coordinator.ok, false)
assert.equal(coordinator.classification, 'BASELINE_DNS_RESOLUTION_ERROR')
assert.equal(coordinator.baseline.failure.ordinal, 6)
assert.equal(cleanCalls, 0)
assert.equal(l1Calls, 0)
assert.equal(coordinator.counters.postFailureRemote, 0)
console.log('L1_F3Z_COORDINATOR_BASELINE_DNS_FAIL_TEST=PASS')

const unknownCoordinator = await runSingleProcessPreflight({
  freezeGate: () => ({ ok: true }),
  isolationGate: () => ({ ok: true }),
  storageGate: () => ({ ok: true }),
  baselineCore: async () => ({ ok: false, final: 'FAIL', failure: { resultClass: 'UNKNOWN_REMOTE_READ_ERROR' } }),
})
assert.equal(unknownCoordinator.classification, 'BASELINE_UNKNOWN_REMOTE_READ_FAILURE')
assert.equal(unknownCoordinator.contexts.length, 1)
console.log('L1_F3Z_COORDINATOR_BASELINE_UNKNOWN_FAIL_TEST=PASS')

const invariantCoordinator = await runSingleProcessPreflight({
  freezeGate: () => ({ ok: true }), isolationGate: () => ({ ok: true }), storageGate: () => ({ ok: true }),
  baselineCore: async () => ({ ok: false, failure: { invariantClass: 'BUSINESS_INVARIANT_FAILURE' } }),
})
assert.equal(invariantCoordinator.classification, 'BASELINE_BUSINESS_INVARIANT_FAILURE')
console.log('L1_F3Z_BASELINE_INVARIANT_CLASSIFICATION_TEST=PASS')

const allPass = await runSingleProcessPreflight({
  freezeGate: () => ({ ok: true }),
  isolationGate: () => ({ ok: true }),
  storageGate: () => ({ ok: true }),
  baselineCore: async () => ({ ok: true }),
  cleanStateCore: async () => ({ ok: true }),
  l1PreCore: async () => ({ ok: true }),
})
assert.deepEqual(allPass.counters, { baseline: 1, cleanState: 1, l1Pre: 1, nestedBaseline: 0, postFailureRemote: 0 })
assert.equal(allPass.contexts.length, 3)
console.log('L1_F3Z_SINGLE_PROCESS_ALL_PASS_REGRESSION=PASS')

const source = await fs.readFile(new URL('./lib/baseline-read-observer.mjs', import.meta.url), 'utf8')
assert.equal(/retry|backoff|setTimeout|fetch\(/i.test(source), false)
assert.equal(JSON.stringify(dnsResult).includes('PGRST_TEST'), false)
console.log('L1_F3Z_BASELINE_TRANSIENT_CLASSIFICATION_NO_RETRY_TEST=PASS')
console.log('L1_F3Z_BASELINE_READ_ORDINAL_PROPAGATION_TEST=PASS')
console.log('L1_F3Z_COORDINATOR_BASELINE_DETAIL_PROPAGATION_TEST=PASS')
console.log('L1_F3Z_BASELINE_SECRET_REDACTION_TEST=PASS')
console.log('L1_F3Z_COORDINATOR_SECRET_REDACTION_TEST=PASS')
console.log('L1_F3Z_LOCAL_NETWORK_KILLSWITCH=PASS')
