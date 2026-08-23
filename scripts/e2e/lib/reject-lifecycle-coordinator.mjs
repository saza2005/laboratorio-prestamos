import { assertActionDoneReady, assertBrowserRejectCompletion } from './reject-completion-gate.mjs'

export const DB_CLASSIFICATION_RESULTS = Object.freeze({
  BUSINESS_WRITE_CONFIRMED: 'BUSINESS_WRITE_CONFIRMED',
  NO_MUTATION_EXPECTED: 'NO_MUTATION_EXPECTED',
})

export function publishActionRunningAfterCompletion({ evidence, publishActionRunning, reportObservability = () => {} }) {
  reportObservability(evidence)
  assertBrowserRejectCompletion(evidence)
  publishActionRunning()
  return {
    actionRunningPublishedCount: 1,
    events: [
      'CLICK_RETURNED',
      'SERVER_ACTION_REQUEST_SEEN',
      'SERVER_ACTION_COMPLETION_OBSERVED',
      'ACTION_RUNNING',
    ],
  }
}

export async function coordinateDbClassificationAfterActionRunning({
  classifyDb,
  publishActionDone,
  initialEvents = [],
}) {
  const events = [...initialEvents, 'DB_CLASSIFICATION_STARTED']
  let dbResult
  try {
    dbResult = await classifyDb()
  } catch (cause) {
    events.push('TERMINAL_DB_CLASSIFICATION_FAILURE')
    const error = new Error('db_classification_failed', { cause })
    error.lifecycle = {
      events,
      dbClassificationStartedCount: 1,
      dbClassificationCompletedCount: 0,
      actionDonePublishedCount: 0,
      terminalResult: 'DB_CLASSIFICATION_FAILURE',
    }
    throw error
  }

  events.push('DB_CLASSIFICATION_COMPLETED')
  if (dbResult === DB_CLASSIFICATION_RESULTS.NO_MUTATION_EXPECTED) {
    events.push('TERMINAL_READ_ONLY_RESULT')
    return {
      events,
      businessResult: dbResult,
      dbClassificationStartedCount: 1,
      dbClassificationCompletedCount: 1,
      actionDonePublishedCount: 0,
      terminalResult: 'READ_ONLY_NO_MUTATION',
    }
  }

  if (dbResult !== DB_CLASSIFICATION_RESULTS.BUSINESS_WRITE_CONFIRMED) {
    events.push('TERMINAL_AMBIGUOUS_BUSINESS_RESULT')
    const error = new Error('ambiguous_business_result')
    error.lifecycle = {
      events,
      dbClassificationStartedCount: 1,
      dbClassificationCompletedCount: 1,
      actionDonePublishedCount: 0,
      terminalResult: 'AMBIGUOUS_BUSINESS_RESULT',
    }
    throw error
  }

  let actionDonePublishedCount = 0
  assertActionDoneReady({
    browserCompletionObserved: true,
    dbClassificationStartedCount: 1,
    dbClassificationCompletedCount: 1,
    businessWriteConfirmed: true,
    actionDonePublishedCount,
  })
  publishActionDone()
  actionDonePublishedCount += 1
  events.push('ACTION_DONE', 'TERMINAL_BUSINESS_SUCCESS')
  return {
    events,
    businessResult: dbResult,
    dbClassificationStartedCount: 1,
    dbClassificationCompletedCount: 1,
    actionDonePublishedCount,
    terminalResult: 'BUSINESS_SUCCESS',
  }
}

export async function runRejectLifecycleCoordinator({
  evidence,
  publishActionRunning,
  classifyDb,
  publishActionDone,
  reportObservability,
}) {
  const browser = publishActionRunningAfterCompletion({
    evidence,
    publishActionRunning,
    reportObservability,
  })
  const db = await coordinateDbClassificationAfterActionRunning({
    classifyDb,
    publishActionDone,
    initialEvents: browser.events,
  })
  return { ...browser, ...db }
}
