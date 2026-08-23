import diagnosticsChannel from 'node:diagnostics_channel'
import { safeErrorFingerprint } from './clean-state-diagnostics.mjs'

const CHANNELS = ['undici:request:create', 'undici:request:headers', 'undici:request:error']

export function passiveObserverAvailable() {
  return CHANNELS.every((name) => Boolean(diagnosticsChannel.channel(name)))
}

export function startPassiveObserver(getReadOrdinal = () => 0, targetHost = '') {
  if (!passiveObserverAvailable()) return null
  const events = []
  const attemptHosts = new Map()
  const attemptRequestHosts = new Map()
  let currentAttempt = 0
  const compareHost = (error) => {
    const rawHost = error?.hostname ?? error?.cause?.hostname
    if (rawHost) {
      attemptHosts.set(`${getReadOrdinal()}:${currentAttempt}`, rawHost)
      return compareRawErrorHost(error, targetHost)
    }
    return compareRawErrorHost(error, targetHost)
  }
  const subscriptions = [
    ['undici:request:create', (message) => {
      const readOrdinal = getReadOrdinal()
      const requestHost = message?.request?.origin
      if (requestHost) attemptRequestHosts.set(`${readOrdinal}:${currentAttempt}`, safeHostname(requestHost))
      events.push({
        event: 'REQUEST_CREATE',
        readOrdinal,
        attempt: currentAttempt,
        requestClass: message?.request?.method ? 'HTTP_REQUEST' : 'UNKNOWN_REQUEST',
        hostMatch: requestHost ? compareRawErrorHost({ hostname: safeHostname(requestHost) }, targetHost) : 'HOSTNAME_NOT_AVAILABLE',
      })
    }],
    ['undici:request:headers', (message) => events.push({
      event: 'RESPONSE_HEADERS',
      readOrdinal: getReadOrdinal(),
      attempt: currentAttempt,
      statusClass: classifyStatus(message?.response?.statusCode),
    })],
    ['undici:request:error', (message) => events.push({
      event: 'REQUEST_ERROR',
      readOrdinal: getReadOrdinal(),
      attempt: currentAttempt,
      fingerprint: {
        ...safeErrorFingerprint(message?.error),
        transportClass: classifyTransport(message?.error),
        hostMatch: compareHost(message?.error),
      },
    })],
  ]
  for (const [name, listener] of subscriptions) diagnosticsChannel.channel(name).subscribe(listener)
  return {
    events,
    setAttempt(attempt) {
      currentAttempt = attempt
    },
    getAttemptEvidence(readOrdinal, attempt) {
      const matching = events.filter((event) => event.event === 'REQUEST_ERROR' && event.readOrdinal === readOrdinal && event.attempt === attempt)
      if (matching.length !== 1) return { status: matching.length === 0 ? 'NONE' : 'AMBIGUOUS', events: matching }
      return { status: 'ONE', events: matching, rawHost: attemptHosts.get(`${readOrdinal}:${attempt}`) ?? attemptRequestHosts.get(`${readOrdinal}:${attempt}`) }
    },
    getAttemptSummary(readOrdinal, attempt) {
      const matching = events.filter((event) => event.readOrdinal === readOrdinal && event.attempt === attempt)
      const error = matching.find((event) => event.event === 'REQUEST_ERROR')
      const headers = matching.find((event) => event.event === 'RESPONSE_HEADERS')
      const request = matching.find((event) => event.event === 'REQUEST_CREATE')
      return {
        statusClass: headers?.statusClass ?? 'NO_FAILURE',
        hostMatch: error?.fingerprint?.hostMatch ?? request?.hostMatch ?? 'HOSTNAME_NOT_AVAILABLE',
      }
    },
    stop() {
      for (const [name, listener] of subscriptions) diagnosticsChannel.channel(name).unsubscribe(listener)
    },
  }
}

export function compareRawErrorHost(error, targetHost) {
  if (!targetHost) return 'EXPECTED_TARGET_MISSING'
  const rawHost = error?.hostname ?? error?.cause?.hostname
  if (!rawHost) return 'HOSTNAME_NOT_AVAILABLE'
  return rawHost === targetHost ? 'MATCH' : 'MISMATCH'
}

function safeHostname(value) {
  try { return new URL(String(value)).hostname } catch { return '' }
}

function classifyStatus(status) {
  if (!Number.isFinite(status)) return 'UNKNOWN'
  if (status >= 500) return 'HTTP_5XX'
  if (status >= 400) return 'HTTP_4XX'
  if (status >= 200) return 'HTTP_2XX'
  return 'OTHER'
}

function classifyTransport(error) {
  const fingerprint = safeErrorFingerprint(error)
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(fingerprint.codeClass) || fingerprint.syscallClass === 'GETADDRINFO') return 'DNS_RESOLUTION_ERROR'
  if (fingerprint.codeClass === 'ECONNRESET') return 'CONNECTION_RESET'
  if (fingerprint.codeClass === 'ETIMEDOUT') return 'CONNECT_TIMEOUT'
  if (fingerprint.timeoutOrAbortClass === 'TIMEOUT_OR_ABORT') return 'READ_TIMEOUT'
  return 'UNKNOWN_THROWN_ERROR'
}
