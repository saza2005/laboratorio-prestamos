function fail(category) {
  throw new Error(category)
}

export function assertBrowserRejectCompletion({
  clickReturnedCount,
  serverActionRequestSeenCount,
  serverActionRequestCorrelated,
  serverActionCompletionObserved,
  serverActionPostAttempts,
  unexpectedApplicationPostAttempts,
}) {
  if (clickReturnedCount !== 1) fail('reject_click_not_returned_once')
  if (serverActionRequestSeenCount !== 1) fail('server_action_request_count_mismatch')
  if (serverActionRequestCorrelated !== true) fail('server_action_completion_not_correlated')
  if (serverActionCompletionObserved !== true) fail('server_action_completion_not_observed')
  if (serverActionPostAttempts !== 1) fail('server_action_post_count_mismatch')
  if (unexpectedApplicationPostAttempts !== 0) fail('unexpected_application_post')
  return true
}

export function assertActionDoneReady({
  browserCompletionObserved,
  dbClassificationStartedCount,
  dbClassificationCompletedCount,
  businessWriteConfirmed,
  actionDonePublishedCount,
}) {
  if (browserCompletionObserved !== true) fail('browser_completion_not_observed')
  if (dbClassificationStartedCount !== 1) fail('db_classification_not_started_once')
  if (dbClassificationCompletedCount !== 1) fail('db_classification_not_completed_once')
  if (businessWriteConfirmed !== true) fail('business_write_not_confirmed')
  if (actionDonePublishedCount !== 0) fail('action_done_already_published')
  return true
}
