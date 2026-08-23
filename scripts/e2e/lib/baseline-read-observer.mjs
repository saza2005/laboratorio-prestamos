import { describeSupabaseResult } from './clean-state-diagnostics.mjs'

const TRANSPORT_CLASSES = new Set(['DNS_RESOLUTION_ERROR', 'CONNECTION_RESET', 'CONNECT_TIMEOUT', 'READ_TIMEOUT'])

export async function runBaselineRead({ operation, ordinal, readClass, observer, onEvent = () => {} }) {
  const started = Date.now()
  observer?.setAttempt?.(1)
  try {
    const response = await operation()
    const boundary = describeSupabaseResult(response)
    if (response?.error) {
      const evidence = safeEvidence(observer, ordinal)
      const summary = safeSummary(observer, ordinal)
      const rawClass = evidence.status === 'ONE' ? evidence.events[0]?.fingerprint?.transportClass : undefined
      const failure = {
        ordinal,
        readClass,
        resultClass: boundary.errorClass,
        dataClass: boundary.dataClass,
        statusClass: summary.statusClass ?? boundary.errorStatusClass,
        rawTransportClass: TRANSPORT_CLASSES.has(rawClass) ? rawClass : 'NO_FAILURE',
        hostClass: hostClass(summary.hostMatch),
        invariantClass: 'NOT_APPLICABLE',
      }
      if (evidence.status === 'EXCEPTION' || summary.__exception) failure.failureClass = 'BASELINE_OBSERVER_EXCEPTION'
      if (!safeEmit(onEvent, { ordinal, readClass, attempt: 1, result: 'FAIL', errorLayer: rawClass ? 'TRANSPORT' : 'POSTGREST', errorClass: rawClass ?? boundary.errorClass, statusClass: failure.statusClass })) failure.failureClass = 'BASELINE_OBSERVER_CALLBACK_EXCEPTION'
      return { ok: false, rows: [], error: 'read_failed', failure }
    }
    const statusClass = safeSummary(observer, ordinal).statusClass
    if (!safeEmit(onEvent, { ordinal, readClass, attempt: 1, result: 'PASS', errorLayer: 'NONE', errorClass: 'NO_FAILURE', statusClass, durationClass: durationClass(Date.now() - started) })) {
      return { ok: false, rows: [], error: 'read_failed', failure: { ordinal, readClass, resultClass: 'NO_RESULT', dataClass: 'UNKNOWN', statusClass: 'UNKNOWN', rawTransportClass: 'UNKNOWN', hostClass: 'HOSTNAME_NOT_AVAILABLE', invariantClass: 'NOT_APPLICABLE', failureClass: 'BASELINE_OBSERVER_CALLBACK_EXCEPTION' } }
    }
    return { ok: true, rows: response?.data ?? [], responseClass: boundary }
  } catch {
    const evidence = safeEvidence(observer, ordinal)
    const summary = safeSummary(observer, ordinal)
    const rawClass = evidence.status === 'ONE' ? evidence.events[0]?.fingerprint?.transportClass : undefined
    const failure = {
      ordinal,
      readClass,
      resultClass: 'NO_RESULT',
      dataClass: 'UNKNOWN',
      statusClass: summary.statusClass ?? 'UNKNOWN',
      rawTransportClass: rawClass ?? 'UNKNOWN_REMOTE_READ_ERROR',
      hostClass: hostClass(summary.hostMatch),
      invariantClass: 'NOT_APPLICABLE',
    }
    if (evidence.status === 'EXCEPTION' || summary.__exception) failure.failureClass = 'BASELINE_OBSERVER_EXCEPTION'
    if (!safeEmit(onEvent, { ordinal, readClass, attempt: 1, result: 'FAIL', errorLayer: rawClass ? 'TRANSPORT' : 'REMOTE', errorClass: failure.rawTransportClass, statusClass: failure.statusClass })) failure.failureClass = 'BASELINE_OBSERVER_CALLBACK_EXCEPTION'
    return { ok: false, rows: [], error: 'read_failed', failure }
  }
}

function safeEmit(callback, event) {
  try { callback(event); return true } catch { return false }
}

function safeSummary(observer, ordinal) {
  try { return observer?.getAttemptSummary?.(ordinal, 1) ?? {} } catch { return { __exception: true } }
}

function safeEvidence(observer, ordinal) {
  try { return observer?.getAttemptEvidence?.(ordinal, 1) ?? { status: 'NONE', events: [] } } catch { return { status: 'EXCEPTION', events: [] } }
}

function hostClass(value) {
  if (value === 'MATCH') return 'E2E_SUPABASE_HOST'
  if (value === 'MISMATCH') return 'OTHER_HOST'
  return value === 'HOSTNAME_NOT_AVAILABLE' ? value : 'HOSTNAME_NOT_AVAILABLE'
}

function durationClass(milliseconds) {
  if (milliseconds < 250) return 'UNDER_250MS'
  if (milliseconds < 2000) return '250MS_TO_2S'
  return 'OVER_2S'
}
