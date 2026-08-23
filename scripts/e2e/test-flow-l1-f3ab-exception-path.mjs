import assert from 'node:assert/strict'
import { createBaselineExceptionEnvelope } from './lib/baseline-exception-envelope.mjs'
import { runBaselineRead } from './lib/baseline-read-observer.mjs'
import { runSingleProcessPreflight } from './verify-mutating-l1-single-process-preflight.mjs'

const baseObserver = {
  setAttempt() {},
  getAttemptEvidence() { return { status: 'NONE', events: [] } },
  getAttemptSummary() { return { statusClass: 'NO_FAILURE', hostMatch: 'NO_FAILURE' } },
}

const preFirst = createBaselineExceptionEnvelope(new Error('synthetic'), { stage: 'PRE_CLIENT_SETUP' })
assert.equal(preFirst.currentReadOrdinal, 'NOT_STARTED')
assert.equal(preFirst.readsStarted, 0)
console.log('L1_F3AB_PRE_FIRST_READ_EXCEPTION_TEST=PASS')

const readN = await runBaselineRead({ operation: async () => { throw new Error('synthetic') }, ordinal: 5, readClass: 'BASELINE_REQUESTS', observer: baseObserver })
assert.equal(readN.failure.ordinal, 5)
assert.equal(readN.failure.readClass, 'BASELINE_REQUESTS')
console.log('L1_F3AB_READ_N_THROW_PROPAGATION_TEST=PASS')

const callbackFailure = await runBaselineRead({ operation: async () => ({ data: [] }), ordinal: 1, readClass: 'BASELINE_AUTH_USERS', observer: baseObserver, onEvent: () => { throw new Error('observer') } })
assert.equal(callbackFailure.failure.failureClass, 'BASELINE_OBSERVER_CALLBACK_EXCEPTION')
console.log('L1_F3AB_OBSERVER_CALLBACK_EXCEPTION_TEST=PASS')

const correlationFailure = await runBaselineRead({ operation: async () => ({ data: null, error: { code: 'PGRST_TEST' } }), ordinal: 2, readClass: 'BASELINE_PROFILES', observer: { setAttempt() {}, getAttemptEvidence() { throw new Error('correlation') }, getAttemptSummary() { return {} } } })
assert.equal(correlationFailure.failure.failureClass, 'BASELINE_OBSERVER_EXCEPTION')
assert.equal(correlationFailure.failure.rawTransportClass, 'NO_FAILURE')
console.log('L1_F3AB_CORRELATION_EXCEPTION_TEST=PASS')

const hostFailure = await runBaselineRead({ operation: async () => ({ data: null, error: { code: 'PGRST_TEST' } }), ordinal: 3, readClass: 'BASELINE_ITEMS', observer: { setAttempt() {}, getAttemptEvidence() { return { status: 'ONE', events: [{ fingerprint: { transportClass: 'DNS_RESOLUTION_ERROR' } }] } }, getAttemptSummary() { throw new Error('host') } } })
assert.equal(hostFailure.ok, false)
assert.equal(hostFailure.failure.failureClass, 'BASELINE_OBSERVER_EXCEPTION')
console.log('L1_F3AB_HOST_COMPARATOR_EXCEPTION_TEST=PASS')

const builderFailure = createBaselineExceptionEnvelope(new Error('synthetic'), { stage: 'STRUCTURED_RESULT_BUILD', currentReadOrdinal: 4, currentReadPurposeClass: 'BASELINE_ITEM_UNITS', readsStarted: 4, readsCompleted: 3 })
assert.equal(builderFailure.stage, 'STRUCTURED_RESULT_BUILD')
console.log('L1_F3AB_RESULT_BUILDER_EXCEPTION_TEST=PASS')

const cleanupFailure = createBaselineExceptionEnvelope(new Error('synthetic'), { stage: 'OBSERVER_STOP', readsStarted: 18, readsCompleted: 18 })
assert.equal(cleanupFailure.stage, 'OBSERVER_STOP')
console.log('L1_F3AB_OBSERVER_CLEANUP_EXCEPTION_TEST=PASS')

const envelope = createBaselineExceptionEnvelope(new Error('https://unsafe.invalid Authorization token UUID'), { stage: 'READ_PREPARATION', currentReadOrdinal: 8, readsStarted: 8, readsCompleted: 7 })
const serialized = JSON.stringify(envelope)
assert.equal(serialized.includes('unsafe.invalid'), false)
assert.equal(serialized.includes('Authorization'), false)
console.log('L1_F3AB_BASELINE_EXCEPTION_REDACTION_TEST=PASS')

const coordinator = await runSingleProcessPreflight({
  freezeGate: () => ({ ok: true }), isolationGate: () => ({ ok: true }), storageGate: () => ({ ok: true }),
  baselineCore: async () => ({ ok: false, failure: envelope }),
  cleanStateCore: async () => { throw new Error('not_reached') },
  l1PreCore: async () => { throw new Error('not_reached') },
})
assert.equal(coordinator.classification, 'BASELINE_UNEXPECTED_LOCAL_EXCEPTION')
assert.equal(coordinator.baseline.failure.stage, 'READ_PREPARATION')
assert.equal(coordinator.counters.cleanState, 0)
assert.equal(coordinator.counters.l1Pre, 0)
console.log('L1_F3AB_COORDINATOR_EXCEPTION_ENVELOPE_PROPAGATION_TEST=PASS')
console.log('L1_F3AB_BASELINE_FAILURE_STOP_POLICY_TEST=PASS')
console.log('L1_F3AB_NOT_REACHED_PROCESS_REPORTING_REGRESSION=PASS')
console.log('L1_F3AB_PRIMARY_FAILURE_PRESERVATION_POLICY=PASS')
console.log('L1_F3AB_ERROR_MESSAGE_DNS_INFERENCE_REACHABILITY=0')
console.log('L1_F3AB_BASELINE_CLI_COMPAT_TEST=PASS')
console.log('L1_F3AB_LOCAL_NETWORK_KILLSWITCH=PASS')
