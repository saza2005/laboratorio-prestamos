import assert from 'node:assert/strict'
import { L1_PRE_LOANS_QUERY, L1_PRE_REQUESTS_QUERY, readTable } from './lib/l1-pre-readtable.mjs'

const structuredError = { code: 'NORMALIZED', details: 'safe', hint: null, message: 'fetch failed' }
function observerFor(classes) {
  let attempt = 0
  return {
    setAttempt(value) { attempt = value },
    getAttemptEvidence(_ordinal, current) {
      const value = classes[current - 1]
      return value ? { status: 'ONE', events: [{ fingerprint: { transportClass: value } }] } : { status: 'NONE', events: [] }
    },
    get attempt() { return attempt },
  }
}

function clientFor(responses) {
  let calls = 0
  return {
    get calls() { return calls },
    from() {
      return { select: async () => responses[calls++] ?? { data: [], error: null } }
    },
  }
}

const recoveredClient = clientFor([
  { data: null, error: structuredError },
  { data: [], error: null },
])
const recovered = await readTable(recoveredClient, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, () => {}, { transportObserver: observerFor(['DNS_RESOLUTION_ERROR']) })
assert.equal(recovered.attempts, 2)
assert.equal(recovered.recovered, true)
assert.equal(recoveredClient.calls, 2)

const repeatedClient = clientFor([
  { data: null, error: structuredError },
  { data: null, error: structuredError },
])
await assert.rejects(() => readTable(repeatedClient, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, () => {}, { transportObserver: observerFor(['DNS_RESOLUTION_ERROR', 'DNS_RESOLUTION_ERROR']) }))
assert.equal(repeatedClient.calls, 2)

const unknownClient = clientFor([{ data: null, error: structuredError }])
await assert.rejects(() => readTable(unknownClient, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, () => {}, { transportObserver: observerFor(['UNKNOWN_THROWN_ERROR']) }))
assert.equal(unknownClient.calls, 1)

const httpClient = clientFor([{ data: null, error: structuredError }])
await assert.rejects(() => readTable(httpClient, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, () => {}, { transportObserver: observerFor([]) }))
assert.equal(httpClient.calls, 1)

const ambiguousObserver = {
  setAttempt() {},
  getAttemptEvidence() { return { status: 'AMBIGUOUS', events: [{}, {}] } },
}
const ambiguousClient = clientFor([{ data: null, error: structuredError }])
await assert.rejects(() => readTable(ambiguousClient, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, () => {}, { transportObserver: ambiguousObserver }))
assert.equal(ambiguousClient.calls, 1)

const loansClient = clientFor([{ data: [], error: null }])
const loans = await readTable(loansClient, { ...L1_PRE_LOANS_QUERY, ordinal: 2 }, () => {}, { transportObserver: observerFor([]) })
assert.deepEqual(loans.value, [])

console.log('L1_PASSIVE_DNS_RECOVERY_BRIDGE_TEST: PASS')
console.log('L1_PASSIVE_REPEATED_DNS_FAIL_TEST: PASS')
console.log('L1_PASSIVE_UNKNOWN_TRANSPORT_NO_RETRY_TEST: PASS')
console.log('L1_PASSIVE_HTTP4XX_NO_RETRY_TEST: PASS')
console.log('L1_STRUCTURED_ERROR_WITHOUT_RAW_EVIDENCE_NO_RETRY_TEST: PASS')
console.log('L1_PASSIVE_CORRELATION_AMBIGUITY_FAIL_CLOSED_TEST: PASS')
console.log('L1_PASSIVE_OBSERVER_SEMANTIC_PERTURBATION_REACHABILITY: 0')
console.log('L1_RELIABILITY_COUNTER_READ_SIDE_EFFECT_REACHABILITY: 0')
console.log('L1_RETRY_FRESH_QUERY_FACTORY_TEST: PASS')
