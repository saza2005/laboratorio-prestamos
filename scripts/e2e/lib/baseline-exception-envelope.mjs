import { safeErrorFingerprint } from './clean-state-diagnostics.mjs'

export function createBaselineExceptionEnvelope(error, progress = {}) {
  return {
    failureLayer: 'EXCEPTION',
    failureClass: 'BASELINE_UNEXPECTED_LOCAL_EXCEPTION',
    stage: progress.stage ?? 'UNKNOWN_STAGE',
    currentReadOrdinal: progress.currentReadOrdinal ?? 'NOT_STARTED',
    currentReadPurposeClass: progress.currentReadPurposeClass ?? 'NOT_STARTED',
    readsStarted: progress.readsStarted ?? 0,
    readsCompleted: progress.readsCompleted ?? 0,
    lastCompletedReadOrdinal: progress.lastCompletedReadOrdinal ?? 'NONE',
    rawTransportClass: progress.rawTransportClass ?? 'UNKNOWN',
    hostClass: progress.hostClass ?? 'HOSTNAME_NOT_AVAILABLE',
    statusClass: progress.statusClass ?? 'UNKNOWN',
    fingerprint: safeErrorFingerprint(error),
  }
}
