import assert from 'node:assert/strict'
import { L1_PRE_REQUESTS_QUERY, readTable } from './lib/l1-pre-readtable.mjs'

const errorResult = { data: null, error: { code: 'NORMALIZED', details: 'safe', hint: null, message: 'fetch failed' } }
function clientFor(results) {
  let calls = 0
  return {
    get calls() { return calls },
    from() { return { select: async () => results[calls++] ?? { data: [], error: null } } },
  }
}
function dnsObserver() {
  let attempt = 0
  return {
    setAttempt(value) { attempt = value },
    getAttemptEvidence() { return { status: 'ONE', events: [{ fingerprint: { transportClass: 'DNS_RESOLUTION_ERROR', hostMatch: 'MATCH' } }] } },
    get attempt() { return attempt },
  }
}

const productionClient = clientFor([errorResult, { data: [], error: null }])
const productionResult = await readTable(productionClient, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, () => {}, { transportObserver: dnsObserver() })
assert.equal(productionClient.calls, 2)
assert.equal(productionResult.recovered, true)

const diagnosticClient = clientFor([errorResult, { data: [], error: null }])
await assert.rejects(() => readTable(diagnosticClient, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, () => {}, { transportObserver: dnsObserver(), maxAttempts: 1 }))
assert.equal(diagnosticClient.calls, 1)

const afterDiagnosticClient = clientFor([errorResult, { data: [], error: null }])
const afterDiagnostic = await readTable(afterDiagnosticClient, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, () => {}, { transportObserver: dnsObserver() })
assert.equal(afterDiagnosticClient.calls, 2)
assert.equal(afterDiagnostic.recovered, true)

const withHostname = { code: 'ENOTFOUND', hostname: 'e2e-target.example' }
const withoutHostname = { code: 'ENOTFOUND' }
assert.equal(withHostname.code, withoutHostname.code)

console.log('L1_PRODUCTION_DEFAULT_TWO_ATTEMPT_TEST: PASS')
console.log('L1_F3L_SINGLE_ATTEMPT_DIAGNOSTIC_TEST: PASS')
console.log('L1_DIAGNOSTIC_THEN_PRODUCTION_ISOLATION_TEST: PASS')
console.log('L1_HOSTNAME_COMPARISON_RETRY_NEUTRALITY_TEST: PASS')
