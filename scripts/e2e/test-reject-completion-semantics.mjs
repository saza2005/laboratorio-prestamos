import { assertActionDoneReady, assertBrowserRejectCompletion } from './lib/reject-completion-gate.mjs'

function expectPass(operation, label) {
  try { operation() } catch { throw new Error('completion_case_failed:' + label) }
}

function expectFail(operation, category, label) {
  try { operation() } catch (error) {
    if (error instanceof Error && error.message === category) return
    throw new Error('completion_case_wrong_failure:' + label)
  }
  throw new Error('completion_case_unexpected_pass:' + label)
}

const browserComplete = {
  clickReturnedCount: 1,
  serverActionRequestSeenCount: 1,
  serverActionRequestCorrelated: true,
  serverActionCompletionObserved: true,
  serverActionPostAttempts: 1,
  unexpectedApplicationPostAttempts: 0,
}
const actionDoneReady = {
  browserCompletionObserved: true,
  dbClassificationStartedCount: 1,
  dbClassificationCompletedCount: 1,
  businessWriteConfirmed: true,
  actionDonePublishedCount: 0,
}

expectPass(() => assertBrowserRejectCompletion(browserComplete), 'browser_completed')
expectPass(() => assertActionDoneReady(actionDoneReady), 'successful_mutation_completion')
console.log('SUCCESSFUL_MUTATION_COMPLETION_TEST: PASS')

expectPass(() => assertBrowserRejectCompletion({
  ...browserComplete,
  responseOk: false,
  redirectCompletionObserved: true,
}), 'non_ok_redirect_completion')
console.log('NON_OK_REDIRECT_COMPLETION_TEST: PASS')

expectFail(() => assertBrowserRejectCompletion({ ...browserComplete, serverActionRequestSeenCount: 0, serverActionCompletionObserved: false }), 'server_action_request_count_mismatch', 'click_only')
console.log('CLICK_ONLY_FALSE_POSITIVE_TEST: PASS')

expectFail(() => assertBrowserRejectCompletion({ ...browserComplete, serverActionCompletionObserved: false }), 'server_action_completion_not_observed', 'request_seen_without_completion')
console.log('REQUEST_SEEN_WITHOUT_COMPLETION_TEST: PASS')

expectFail(() => assertActionDoneReady({ ...actionDoneReady, dbClassificationStartedCount: 0, dbClassificationCompletedCount: 0 }), 'db_classification_not_started_once', 'completion_without_db')
console.log('COMPLETION_WITHOUT_DB_CLASSIFICATION_TEST: PASS')

expectFail(() => assertActionDoneReady({ ...actionDoneReady, businessWriteConfirmed: false }), 'business_write_not_confirmed', 'db_failure')
console.log('DB_CLASSIFICATION_FAILURE_TEST: PASS')

expectFail(() => assertActionDoneReady({ ...actionDoneReady, actionDonePublishedCount: 1 }), 'action_done_already_published', 'action_done_once')
console.log('ACTION_DONE_ONCE_TEST: PASS')

expectFail(() => assertBrowserRejectCompletion({ ...browserComplete, unexpectedApplicationPostAttempts: 1 }), 'unexpected_application_post', 'unknown_post')
console.log('UNKNOWN_POST_FAIL_CLOSED_TEST: PASS')

console.log('REJECT_COMPLETION_LOCAL_TESTS: PASS')
console.log('ACTION_DONE_FALSE_POSITIVE_REACHABILITY: 0')
