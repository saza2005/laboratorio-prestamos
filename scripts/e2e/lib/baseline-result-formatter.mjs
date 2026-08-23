function firstPresent(source, keys, fallback) {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null) return value
  }
  return fallback
}

export function formatBaselineFailure(failure = {}) {
  const fingerprint = failure.exceptionFingerprintClass ?? failure.fingerprint?.constructorClass
  return {
    failureLayer: firstPresent(failure, ['failureLayer', 'errorLayer'], 'UNKNOWN'),
    failureClass: firstPresent(failure, ['failureClass'], 'UNKNOWN'),
    failureStage: firstPresent(failure, ['stage', 'failureStage'], 'UNKNOWN'),
    currentReadOrdinal: firstPresent(failure, ['currentReadOrdinal', 'ordinal'], 'UNKNOWN'),
    currentReadPurposeClass: firstPresent(failure, ['currentReadPurposeClass', 'readClass'], 'UNKNOWN'),
    readsStarted: firstPresent(failure, ['readsStarted'], 'UNKNOWN'),
    readsCompleted: firstPresent(failure, ['readsCompleted'], 'UNKNOWN'),
    rawTransportClass: firstPresent(failure, ['rawTransportClass'], 'UNKNOWN'),
    postgrestResultClass: firstPresent(failure, ['postgrestResultClass', 'resultClass'], 'UNKNOWN'),
    statusClass: firstPresent(failure, ['statusClass'], 'UNKNOWN'),
    hostClass: firstPresent(failure, ['hostClass'], 'HOSTNAME_NOT_AVAILABLE'),
    rawToResultCorrelationValid: firstPresent(failure, ['rawToResultCorrelationValid', 'correlation'], 'unknown'),
    exceptionFingerprintClass: fingerprint ?? 'UNKNOWN',
  }
}

export function formatPreflightResult(result) {
  return {
    preflight: result?.ok ? 'PASS' : 'FAIL',
    baselineCoreExecutions: result?.counters?.baseline ?? 0,
    cleanStateCoreExecutions: result?.counters?.cleanState ?? 0,
    l1PreCoreExecutions: result?.counters?.l1Pre ?? 0,
    nestedBaselineExecutions: result?.counters?.nestedBaseline ?? 0,
    postFailureRemoteCheckExecutions: result?.counters?.postFailureRemote ?? 0,
    baselineFailure: result?.baseline?.failure ? formatBaselineFailure(result.baseline.failure) : null,
    cleanStateResult: result?.cleanState ? (result.cleanState.ok ? 'PASS' : 'FAIL') : 'NOT_REACHED',
    l1PreResult: result?.l1Pre ? (result.l1Pre.ok ? 'PASS' : 'FAIL') : 'NOT_REACHED',
  }
}
