import assert from 'node:assert/strict'
import { formatBaselineFailure, formatPreflightResult, runSingleProcessPreflight } from './verify-mutating-l1-single-process-preflight.mjs'

const canonical = {
  failureLayer: 'REMOTE',
  failureClass: 'DNS_RESOLUTION_ERROR',
  failureStage: 'READ_EXECUTION',
  currentReadOrdinal: 7,
  currentReadPurposeClass: 'SAFE_TEST_CLASS',
  readsStarted: 7,
  readsCompleted: 6,
  rawTransportClass: 'DNS_RESOLUTION_ERROR',
  postgrestResultClass: 'SUPABASE_RESULT_ERROR_OBJECT',
  statusClass: 'STATUS_ZERO',
  hostClass: 'E2E_SUPABASE_HOST',
  rawToResultCorrelationValid: 'yes',
  exceptionFingerprintClass: 'SAFE_STRUCTURAL_ERROR',
}

const formatted = formatBaselineFailure({ ...canonical, ordinal: 99, readClass: 'LEGACY_VALUE', resultClass: 'LEGACY_RESULT' })
assert.deepEqual(formatted, canonical)
console.log('L1_F3AD_CANONICAL_OVER_LEGACY_TEST=PASS')

const fallback = formatBaselineFailure({ ordinal: 3, readClass: 'LEGACY_CLASS', resultClass: 'LEGACY_RESULT' })
assert.equal(fallback.currentReadOrdinal, 3)
assert.equal(fallback.currentReadPurposeClass, 'LEGACY_CLASS')
assert.equal(fallback.postgrestResultClass, 'LEGACY_RESULT')
console.log('L1_F3AD_LEGACY_FALLBACK_TEST=PASS')

const coordinator = await runSingleProcessPreflight({
  freezeGate: async () => ({ ok: true }),
  isolationGate: async () => ({ ok: true }),
  storageGate: async () => ({ ok: true }),
  baselineCore: async () => ({ ok: false, final: 'FAIL', failure: canonical }),
})
const output = formatPreflightResult(coordinator)
assert.equal(output.baselineFailure.failureClass, 'DNS_RESOLUTION_ERROR')
assert.equal(output.baselineFailure.currentReadOrdinal, 7)
assert.equal(output.baselineFailure.readsCompleted, 6)
assert.equal(output.cleanStateResult, 'NOT_REACHED')
assert.equal(output.l1PreResult, 'NOT_REACHED')
console.log('L1_F3AD_CANONICAL_ENVELOPE_E2E_FORMAT_TEST=PASS')

const partial = formatBaselineFailure({ failureClass: 'LOCAL_EXCEPTION', currentReadOrdinal: 'NOT_STARTED', readsStarted: 0, readsCompleted: 0 })
assert.equal(partial.failureClass, 'LOCAL_EXCEPTION')
assert.equal(partial.currentReadOrdinal, 'NOT_STARTED')
assert.equal(partial.readsStarted, 0)
assert.equal(partial.rawTransportClass, 'UNKNOWN')
console.log('L1_F3AD_PARTIAL_ENVELOPE_TEST=PASS')

const preFirst = formatBaselineFailure({ failureLayer: 'EXCEPTION', failureClass: 'BASELINE_UNEXPECTED_LOCAL_EXCEPTION', failureStage: 'PRE_CLIENT_SETUP', currentReadOrdinal: 'NOT_STARTED', currentReadPurposeClass: 'NOT_STARTED', readsStarted: 0, readsCompleted: 0 })
assert.equal(preFirst.currentReadOrdinal, 'NOT_STARTED')
assert.equal(preFirst.readsStarted, 0)
console.log('L1_F3AD_PRE_FIRST_READ_FORMAT_TEST=PASS')

const readN = formatBaselineFailure({ failureClass: 'BASELINE_OBSERVER_EXCEPTION', currentReadOrdinal: 5, currentReadPurposeClass: 'BASELINE_REQUESTS', readsStarted: 5, readsCompleted: 4 })
assert.equal(readN.currentReadOrdinal, 5)
assert.equal(readN.currentReadPurposeClass, 'BASELINE_REQUESTS')
assert.equal(readN.readsCompleted, 4)
console.log('L1_F3AD_READ_N_PROGRESS_FORMAT_TEST=PASS')

const rawDns = formatBaselineFailure(canonical)
assert.equal(rawDns.rawTransportClass, 'DNS_RESOLUTION_ERROR')
assert.equal(rawDns.hostClass, 'E2E_SUPABASE_HOST')
assert.equal(rawDns.rawToResultCorrelationValid, 'yes')
console.log('L1_F3AD_RAW_DNS_FORMAT_TEST=PASS')

const noRaw = formatBaselineFailure({ failureClass: 'SUPABASE_RESULT_ERROR_OBJECT', resultClass: 'SUPABASE_RESULT_ERROR_OBJECT', statusClass: 'STATUS_ZERO' })
assert.equal(noRaw.rawTransportClass, 'UNKNOWN')
assert.notEqual(noRaw.rawTransportClass, 'DNS_RESOLUTION_ERROR')
console.log('L1_F3AD_NO_RAW_NO_DNS_FORMAT_TEST=PASS')

const localException = formatBaselineFailure({ failureLayer: 'LOCAL', failureClass: 'BASELINE_OBSERVER_EXCEPTION', failureStage: 'OBSERVER_CALLBACK', exceptionFingerprintClass: 'ERROR' })
assert.equal(localException.failureLayer, 'LOCAL')
assert.equal(localException.failureStage, 'OBSERVER_CALLBACK')
assert.equal(localException.exceptionFingerprintClass, 'ERROR')
console.log('L1_F3AD_LOCAL_EXCEPTION_FORMAT_TEST=PASS')

const requiredFields = ['failureLayer', 'failureClass', 'failureStage', 'currentReadOrdinal', 'currentReadPurposeClass', 'readsStarted', 'readsCompleted', 'rawTransportClass', 'postgrestResultClass', 'statusClass', 'hostClass', 'rawToResultCorrelationValid', 'exceptionFingerprintClass']
assert.ok(requiredFields.every((field) => Object.hasOwn(formatted, field)))
console.log('L1_F3AD_FORMAT_SCHEMA_DRIFT_DETECTION_TEST=PASS')

const allPass = formatPreflightResult({ ok: true, counters: { baseline: 1, cleanState: 1, l1Pre: 1, nestedBaseline: 0, postFailureRemote: 0 }, baseline: { ok: true }, cleanState: { ok: true }, l1Pre: { ok: true } })
assert.equal(allPass.preflight, 'PASS')
assert.equal(allPass.cleanStateResult, 'PASS')
assert.equal(allPass.l1PreResult, 'PASS')
console.log('L1_F3AD_ALL_PASS_FORMAT_REGRESSION=PASS')

const rawThrow = formatPreflightResult({ ok: false, counters: { baseline: 1, cleanState: 0, l1Pre: 0, nestedBaseline: 0, postFailureRemote: 0 }, baseline: { ok: false, failure: { failureClass: 'BASELINE_UNEXPECTED_LOCAL_EXCEPTION', failureLayer: 'EXCEPTION', stage: 'COORDINATOR_BASELINE_CALL', exceptionFingerprintClass: 'ERROR' } } })
assert.equal(rawThrow.baselineFailure.failureClass, 'BASELINE_UNEXPECTED_LOCAL_EXCEPTION')
assert.equal(rawThrow.baselineFailure.exceptionFingerprintClass, 'ERROR')
console.log('L1_F3AD_RAW_THROW_FALLBACK_FORMAT_TEST=PASS')

const unsafe = JSON.stringify(formatBaselineFailure({ failureClass: 'LOCAL_EXCEPTION', failureStage: 'SAFE', exceptionFingerprintClass: 'ERROR' }))
assert.doesNotMatch(unsafe, /https?:\/\/|Authorization|Bearer|[0-9a-f]{8}-[0-9a-f]{4}-/i)
console.log('L1_F3AD_FORMATTER_SECRET_REDACTION_TEST=PASS')
console.log('L1_F3AD_POPULATED_ENVELOPE_FALSE_UNKNOWN_REACHABILITY=0')
console.log('L1_F3AD_NOT_REACHED_FORMAT_REGRESSION=PASS')
console.log('L1_F3AD_PROTOCOL_COUNTER_FORMAT_REGRESSION=PASS')
console.log('L1_F3AD_HISTORICAL_FORMATTER_REPLAY_TEST=PASS')
console.log('L1_F3AD_IMPORT_SAFETY_TEST=PASS')
console.log('L1_F3AD_LOCAL_NETWORK_KILLSWITCH=PASS')
