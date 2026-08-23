import { assertActionDoneReady } from './lib/reject-completion-gate.mjs'
import {
  DB_CLASSIFICATION_RESULTS,
  publishActionRunningAfterCompletion,
  runRejectLifecycleCoordinator,
} from './lib/reject-lifecycle-coordinator.mjs'

const completeEvidence = {
  clickReturnedCount: 1,
  serverActionRequestSeenCount: 1,
  serverActionRequestCorrelated: true,
  serverActionCompletionObserved: true,
  serverActionResponseOk: false,
  serverActionResponseStatusClass: '3XX',
  serverActionPostAttempts: 1,
  unexpectedApplicationPostAttempts: 0,
}

function expect(value, expected, label) {
  if (value !== expected) throw new Error(`h8b_expectation_failed:${label}`)
}

function expectFail(operation, category, label) {
  try { operation() } catch (error) {
    if (error instanceof Error && error.message === category) return error
    throw new Error(`h8b_wrong_failure:${label}`)
  }
  throw new Error(`h8b_unexpected_pass:${label}`)
}

async function expectFailAsync(operation, category, label) {
  try { await operation() } catch (error) {
    if (error instanceof Error && error.message === category) return error
    throw new Error(`h8b_wrong_failure:${label}`)
  }
  throw new Error(`h8b_unexpected_pass:${label}`)
}

let actionRunningCount = 0
let actionDoneCount = 0
let observabilityReports = 0
const main = await runRejectLifecycleCoordinator({
  evidence: completeEvidence,
  publishActionRunning: () => { actionRunningCount += 1 },
  reportObservability: (evidence) => {
    observabilityReports += 1
    expect(evidence.serverActionPostAttempts, 1, 'reported_server_action_count')
    expect(evidence.unexpectedApplicationPostAttempts, 0, 'reported_unexpected_count')
    expect(evidence.serverActionResponseOk, false, 'reported_non_ok')
  },
  classifyDb: async () => DB_CLASSIFICATION_RESULTS.NO_MUTATION_EXPECTED,
  publishActionDone: () => { actionDoneCount += 1 },
})

expect(actionRunningCount, 1, 'main_action_running_once')
expect(main.dbClassificationStartedCount, 1, 'main_db_started_once')
expect(main.dbClassificationCompletedCount, 1, 'main_db_completed_once')
expect(main.businessResult, 'NO_MUTATION_EXPECTED', 'main_business_result')
expect(actionDoneCount, 0, 'main_action_done_zero')
expect(main.actionDonePublishedCount, 0, 'main_reported_action_done_zero')
expect(main.terminalResult, 'READ_ONLY_NO_MUTATION', 'main_terminal')
expect(observabilityReports, 1, 'main_observability_once')
expect(main.events.join('->'), [
  'CLICK_RETURNED',
  'SERVER_ACTION_REQUEST_SEEN',
  'SERVER_ACTION_COMPLETION_OBSERVED',
  'ACTION_RUNNING',
  'DB_CLASSIFICATION_STARTED',
  'DB_CLASSIFICATION_COMPLETED',
  'TERMINAL_READ_ONLY_RESULT',
].join('->'), 'main_event_order')
console.log('REAL_COORDINATOR_NON_OK_COMPLETION_TEST: PASS')
console.log('NEXT_303_NON_OK_COMPLETION_TEST: PASS')
console.log('POST_OBSERVABILITY_REPORTING_TEST: PASS')

expectFail(() => publishActionRunningAfterCompletion({
  evidence: { ...completeEvidence, serverActionRequestSeenCount: 0, serverActionCompletionObserved: false },
  publishActionRunning: () => { throw new Error('must_not_publish') },
}), 'server_action_request_count_mismatch', 'click_only')
console.log('CLICK_ONLY_FALSE_POSITIVE_TEST: PASS')

expectFail(() => publishActionRunningAfterCompletion({
  evidence: { ...completeEvidence, serverActionCompletionObserved: false },
  publishActionRunning: () => { throw new Error('must_not_publish') },
}), 'server_action_completion_not_observed', 'request_without_completion')
console.log('REQUEST_SEEN_WITHOUT_COMPLETION_TEST: PASS')

expectFail(() => publishActionRunningAfterCompletion({
  evidence: { ...completeEvidence, serverActionRequestCorrelated: false },
  publishActionRunning: () => { throw new Error('must_not_publish') },
}), 'server_action_completion_not_correlated', 'uncorrelated_completion')
console.log('UNCORRELATED_COMPLETION_FAIL_CLOSED_TEST: PASS')

expectFail(() => publishActionRunningAfterCompletion({
  evidence: { ...completeEvidence, serverActionPostAttempts: 2 },
  publishActionRunning: () => { throw new Error('must_not_publish') },
}), 'server_action_post_count_mismatch', 'multiple_server_actions')
console.log('MULTIPLE_SERVER_ACTION_FAIL_CLOSED_TEST: PASS')

expectFail(() => publishActionRunningAfterCompletion({
  evidence: { ...completeEvidence, unexpectedApplicationPostAttempts: 1 },
  publishActionRunning: () => { throw new Error('must_not_publish') },
}), 'unexpected_application_post', 'unexpected_post')
console.log('UNEXPECTED_POST_FAIL_CLOSED_TEST: PASS')

let failureRunningCount = 0
const dbFailure = await expectFailAsync(() => runRejectLifecycleCoordinator({
  evidence: completeEvidence,
  publishActionRunning: () => { failureRunningCount += 1 },
  classifyDb: async () => { throw new Error('local_db_adapter_failure') },
  publishActionDone: () => { throw new Error('must_not_publish') },
}), 'db_classification_failed', 'db_failure')
expect(failureRunningCount, 1, 'db_failure_action_running_once')
expect(dbFailure.lifecycle.actionDonePublishedCount, 0, 'db_failure_action_done_zero')
console.log('DB_CLASSIFICATION_FAILURE_TEST: PASS')

let successRunningCount = 0
let successDoneCount = 0
const success = await runRejectLifecycleCoordinator({
  evidence: completeEvidence,
  publishActionRunning: () => { successRunningCount += 1 },
  classifyDb: async () => DB_CLASSIFICATION_RESULTS.BUSINESS_WRITE_CONFIRMED,
  publishActionDone: () => { successDoneCount += 1 },
})
expect(successRunningCount, 1, 'success_action_running_once')
expect(successDoneCount, 1, 'success_action_done_once')
expect(success.actionDonePublishedCount, 1, 'success_reported_action_done_once')
expectFail(() => assertActionDoneReady({
  browserCompletionObserved: true,
  dbClassificationStartedCount: 1,
  dbClassificationCompletedCount: 1,
  businessWriteConfirmed: true,
  actionDonePublishedCount: success.actionDonePublishedCount,
}), 'action_done_already_published', 'second_action_done')
console.log('ACTION_DONE_ONCE_TEST: PASS')

console.log('SERVER_ACTION_COMPLETION_BARRIER: PASS')
console.log('ACTION_RUNNING_PUBLISHED_COUNT: 1')
console.log('DB_CLASSIFICATION_STARTED_COUNT: 1')
console.log('DB_CLASSIFICATION_COMPLETED_COUNT: 1')
console.log('BUSINESS_RESULT: NO_MUTATION_EXPECTED')
console.log('ACTION_DONE_PUBLISHED_COUNT: 0')
console.log('ACTION_DONE_FALSE_POSITIVE_REACHABILITY: 0')
console.log('TERMINAL_RESULT: READ_ONLY_NO_MUTATION')
console.log('POST_ACTION_DB_CLASSIFICATION_ORDER: PASS')
console.log('LIFECYCLE_EVENT_ORDER: ' + main.events.join(' -> '))
