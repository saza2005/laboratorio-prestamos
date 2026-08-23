import fs from 'node:fs'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

export const TRANSIENT_READ_ERROR_ALLOWLIST = Object.freeze(new Set([
  'DNS_RESOLUTION_ERROR',
  'CONNECTION_RESET',
  'CONNECT_TIMEOUT',
  'READ_TIMEOUT',
]))

export const DIAGNOSTICS_PATH = path.resolve('.e2e-state/runtime/clean-state-diagnostics.json')
export const DNS_RETRY_BACKOFF_MS = 1000

export function waitForDnsRetryBackoff() {
  return sleep(DNS_RETRY_BACKOFF_MS)
}

export function classifyReadError(error) {
  if (TRANSIENT_READ_ERROR_ALLOWLIST.has(error?.l1DiagnosticClass) && error.transportEvidence === error.l1DiagnosticClass) {
    return { errorLayer: 'TRANSPORT', errorClass: error.l1DiagnosticClass, statusClass: 'NONE' }
  }
  if (error?.l1DiagnosticClass === 'EMPTY_SUPABASE_ERROR_OBJECT' || error?.l1DiagnosticClass === 'SUPABASE_RESULT_ERROR_OBJECT') {
    return { errorLayer: 'POSTGREST', errorClass: error.l1DiagnosticClass, statusClass: 'NONE' }
  }
  const chain = errorChain(error)
  const status = firstNumber(chain, ['status', 'statusCode'])
  const code = firstString(chain, ['code'])
  const name = firstString(chain, ['name']).toLowerCase()
  const message = chain.map((entry) => String(entry.message ?? '').toLowerCase()).join(' ')
  if (status >= 400 && status < 500) return { errorLayer: 'HTTP', errorClass: status === 401 || status === 403 ? 'AUTH_ERROR' : 'HTTP_4XX', statusClass: '4XX' }
  if (status >= 500) return { errorLayer: 'HTTP', errorClass: 'HTTP_5XX', statusClass: '5XX' }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || message.includes('getaddrinfo')) return { errorLayer: 'DNS', errorClass: 'DNS_RESOLUTION_ERROR', statusClass: 'NONE' }
  if (code === 'ECONNREFUSED') return { errorLayer: 'TRANSPORT', errorClass: 'CONNECTION_REFUSED', statusClass: 'NONE' }
  if (code === 'ECONNRESET' || message.includes('connection reset')) return { errorLayer: 'TRANSPORT', errorClass: 'CONNECTION_RESET', statusClass: 'NONE' }
  if (code === 'ETIMEDOUT' || message.includes('connect timeout')) return { errorLayer: 'TRANSPORT', errorClass: 'CONNECT_TIMEOUT', statusClass: 'NONE' }
  if (message.includes('timeout') || name.includes('timeout')) return { errorLayer: 'TRANSPORT', errorClass: 'READ_TIMEOUT', statusClass: 'NONE' }
  if (name.includes('tls') || message.includes('certificate') || message.includes('ssl')) return { errorLayer: 'TLS', errorClass: 'TLS_ERROR', statusClass: 'NONE' }
  if (code.startsWith('PGRST') || message.includes('postgrest')) return { errorLayer: 'POSTGREST', errorClass: 'POSTGREST_ERROR', statusClass: 'NONE' }
  if (message.includes('auth') || message.includes('jwt')) return { errorLayer: 'AUTH', errorClass: 'AUTH_ERROR', statusClass: 'NONE' }
  if (message.includes('query') || message.includes('column') || message.includes('relation')) return { errorLayer: 'QUERY', errorClass: 'QUERY_ERROR', statusClass: 'NONE' }
  if (name.includes('syntax') || message.includes('json')) return { errorLayer: 'PARSE', errorClass: 'RESULT_PARSE_ERROR', statusClass: 'NONE' }
  return { errorLayer: 'REMOTE', errorClass: 'UNKNOWN_REMOTE_READ_ERROR', statusClass: 'NONE' }
}

export function describeSupabaseResult(response) {
  const data = response?.data
  const error = response?.error
  const ownKeys = error && typeof error === 'object' ? Object.keys(error).sort() : []
  const ownPropertyNames = error && typeof error === 'object' ? Object.getOwnPropertyNames(error).sort() : []
  const isPlainObject = Boolean(error) && Object.getPrototypeOf(error) === Object.prototype
  const emptyError = Boolean(error) && isPlainObject && ownKeys.length === 0 && ownPropertyNames.length === 0
  return {
    promiseResolutionClass: 'FULFILLED',
    dataPresent: data !== null && data !== undefined,
    dataClass: Array.isArray(data) ? 'ARRAY' : data === null || data === undefined ? 'NULLISH' : typeof data,
    dataRowCountClass: Array.isArray(data) ? rowCountClass(data.length) : 'NOT_ARRAY',
    errorClass: error === null || error === undefined ? 'NULL' : emptyError ? 'EMPTY_SUPABASE_ERROR_OBJECT' : 'SUPABASE_RESULT_ERROR_OBJECT',
    errorEnumerableKeyNames: ownKeys.slice(0, 20),
    errorOwnPropertyNames: ownPropertyNames.slice(0, 20),
    errorSymbolCount: error && typeof error === 'object' ? Object.getOwnPropertySymbols(error).length : 0,
    errorStatusClass: error && Number.isFinite(Number(error.status)) ? statusClass(Number(error.status)) : 'NONE',
  }
}

export function safeErrorFingerprint(error) {
  const chain = errorChain(error)
  const aggregateErrors = error instanceof AggregateError && Array.isArray(error.errors) ? error.errors.length : 0
  return {
    constructorClass: error?.constructor?.name ?? 'Unknown',
    name: safeClass(error?.name),
    codeClass: safeCode(firstString(chain, ['code'])),
    errnoClass: safeCode(firstString(chain, ['errno'])),
    syscallClass: safeCode(firstString(chain, ['syscall'])),
    causeConstructorClass: chain[1]?.constructor?.name ?? 'NONE',
    causeName: safeClass(chain[1]?.name),
    causeCodeClass: safeCode(chain[1] ? firstString(chain.slice(1), ['code']) : ''),
    causeErrnoClass: safeCode(chain[1] ? firstString(chain.slice(1), ['errno']) : ''),
    causeSyscallClass: safeCode(chain[1] ? firstString(chain.slice(1), ['syscall']) : ''),
    causeChainDepth: Math.max(0, chain.length - 1),
    aggregateNestedErrorCount: aggregateErrors,
    timeoutOrAbortClass: chain.some((entry) => /timeout|abort/i.test(`${entry?.name ?? ''} ${entry?.message ?? ''}`)) ? 'TIMEOUT_OR_ABORT' : 'NONE',
  }
}

export function isTransientReadError(errorClass) {
  return TRANSIENT_READ_ERROR_ALLOWLIST.has(errorClass)
}

export async function readWithBoundedRetry(read, metadata, onEvent = () => {}, { maxAttempts = 2, retryDelay = waitForDnsRetryBackoff } = {}) {
  let attempt = 1
  while (true) {
    const started = Date.now()
    try {
      metadata.onAttemptStart?.(attempt)
      const value = await read()
      onEvent({ ordinal: metadata.ordinal, readClass: metadata.readClass, attempt, durationClass: durationClass(Date.now() - started), result: 'SUCCESS', errorLayer: 'NONE', errorClass: 'SUCCESS', statusClass: 'NONE' })
      return { value, attempts: attempt, recovered: attempt > 1 }
    } catch (error) {
      const classification = classifyReadError(error)
      onEvent({ ordinal: metadata.ordinal, readClass: metadata.readClass, attempt, durationClass: durationClass(Date.now() - started), result: 'FAIL', ...classification })
      if (attempt < maxAttempts && isTransientReadError(classification.errorClass)) {
        if (classification.errorClass === 'DNS_RESOLUTION_ERROR') await retryDelay()
        attempt = 2
        continue
      }
      const failure = new Error('clean_state_read_failed')
      failure.diagnostic = { ...classification, ordinal: metadata.ordinal, readClass: metadata.readClass, attempt, fingerprint: safeErrorFingerprint(error) }
      throw failure
    }
  }
}

export function writeDiagnostics(events, summary = {}) {
  const payload = { version: 1, events, summary }
  fs.mkdirSync(path.dirname(DIAGNOSTICS_PATH), { recursive: true, mode: 0o700 })
  const temp = DIAGNOSTICS_PATH + '.tmp-' + process.pid
  fs.writeFileSync(temp, JSON.stringify(payload, null, 2) + '\n', { mode: 0o600 })
  fs.renameSync(temp, DIAGNOSTICS_PATH)
}

function durationClass(milliseconds) {
  if (milliseconds < 250) return 'UNDER_250MS'
  if (milliseconds < 2000) return '250MS_TO_2S'
  return 'OVER_2S'
}

function rowCountClass(count) {
  if (count === 0) return 'ZERO'
  if (count === 1) return 'ONE'
  if (count < 10) return 'FEW'
  return 'MANY'
}

function statusClass(status) {
  if (status >= 500) return '5XX'
  if (status >= 400) return '4XX'
  if (status >= 300) return '3XX'
  if (status >= 200) return '2XX'
  return 'OTHER'
}

function errorChain(error) {
  const chain = []
  const queue = [error]
  const seen = new Set()
  while (queue.length && chain.length < 8) {
    const current = queue.shift()
    if (!current || (typeof current !== 'object' && typeof current !== 'function') || seen.has(current)) continue
    seen.add(current)
    chain.push(current)
    if (current.cause) queue.push(current.cause)
    if (current instanceof AggregateError && Array.isArray(current.errors)) queue.push(...current.errors)
  }
  return chain
}

function firstString(entries, fields) {
  for (const entry of entries) {
    for (const field of fields) {
      const value = entry?.[field]
      if (typeof value === 'string' && value) return value.toUpperCase()
    }
  }
  return ''
}

function firstNumber(entries, fields) {
  for (const entry of entries) {
    for (const field of fields) {
      const value = Number(entry?.[field])
      if (Number.isFinite(value) && value > 0) return value
    }
  }
  return 0
}

function safeCode(value) {
  return value && /^[A-Z0-9_:-]{1,40}$/.test(value) ? value : 'PRESENT_UNSAFE_OR_ABSENT'
}

function safeClass(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,40}$/.test(value) ? value : value ? 'PRESENT_UNSAFE' : 'NONE'
}
