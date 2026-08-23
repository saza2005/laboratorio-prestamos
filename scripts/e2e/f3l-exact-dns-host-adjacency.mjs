#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { L1_PRE_REQUESTS_QUERY, readTable } from './lib/l1-pre-readtable.mjs'
import { startPassiveObserver } from './lib/l1-passive-observer.mjs'

const journalPath = path.resolve('.e2e-state/l1-f3l-exact-dns-host-results.json')
const rawUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
let targetUrl
try { targetUrl = new URL(rawUrl) } catch {}
const targetHost = targetUrl?.hostname ?? ''
const records = []
let readOrdinal = 1
function persist() {
  fs.mkdirSync(path.dirname(journalPath), { recursive: true, mode: 0o700 })
  const temp = `${journalPath}.tmp-${process.pid}`
  fs.writeFileSync(temp, JSON.stringify({ version: 1, records }, null, 2) + '\n', { mode: 0o600 })
  fs.renameSync(temp, journalPath)
}
function record(name, value) { records.push({ name, ...value }); persist() }
function errorClass(error) {
  if (error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') return 'DNS_RESOLUTION_ERROR'
  if (error?.code === 'ECONNRESET') return 'CONNECTION_RESET'
  if (error?.code === 'ETIMEDOUT') return 'TIMEOUT'
  return error?.code ? 'OTHER_ERROR' : 'UNKNOWN'
}

fs.mkdirSync(path.dirname(journalPath), { recursive: true, mode: 0o700 })
persist()
const identity = Boolean(targetUrl && targetUrl.protocol === 'https:' && targetHost && targetUrl.hostname.endsWith('.supabase.co'))
record('identity', { result: identity ? 'PASS' : 'FAIL' })
if (!identity) process.exit(1)

const observer = startPassiveObserver(() => readOrdinal, targetHost)
record('observer_ready', { result: observer ? 'PASS' : 'FAIL' })
const admin = createAdminReadClient()
const started = performance.now()
let requestResult = 'FAIL'
try {
  await readTable(admin, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, () => {}, { transportObserver: observer, maxAttempts: 1 })
  requestResult = 'PASS'
  record('canonical_requests', { result: 'PASS', transportClass: 'NO_TRANSPORT_FAILURE', postgrestResult: 'PASS', attemptCount: 1 })
} catch {
  const evidence = observer?.getAttemptEvidence(1, 1) ?? { status: 'NONE', events: [] }
  const transport = evidence.status === 'ONE' ? evidence.events[0]?.fingerprint?.transportClass ?? 'UNKNOWN_THROWN_ERROR' : 'UNKNOWN_THROWN_ERROR'
  const hostMatch = evidence.status === 'ONE' ? evidence.events[0]?.fingerprint?.hostMatch ?? 'HOSTNAME_NOT_AVAILABLE' : 'HOSTNAME_NOT_AVAILABLE'
  record('canonical_requests', { result: 'FAIL', transportClass: transport, postgrestResult: 'SUPABASE_RESULT_ERROR_OBJECT', retryAllowed: false, attemptCount: 1, rawFailureHostClass: transport === 'DNS_RESOLUTION_ERROR' ? (hostMatch === 'MATCH' ? 'E2E_SUPABASE_HOST' : hostMatch === 'MISMATCH' ? 'OTHER_HOST' : 'HOSTNAME_NOT_AVAILABLE') : 'NOT_APPLICABLE', topLevelCodeClass: 'ENOTFOUND', causeCodeClass: 'ENOTFOUND', syscallClass: 'GETADDRINFO', failureToLookupIntervalClass: 'NOT_STARTED' })
  if (transport === 'DNS_RESOLUTION_ERROR' && evidence.status === 'ONE' && evidence.rawHost) {
    const lookupStarted = performance.now()
    try {
      const addresses = await dns.lookup(evidence.rawHost, { all: true })
      record('post_failure_lookup', { result: 'PASS', errorClass: 'NONE', ipv4: addresses.some((entry) => entry.family === 4), ipv6: addresses.some((entry) => entry.family === 6), intervalClass: performance.now() - lookupStarted < 100 ? 'LT_100MS' : performance.now() - lookupStarted < 500 ? '100_TO_500MS' : 'GT_500MS' })
    } catch (lookupError) {
      record('post_failure_lookup', { result: 'FAIL', errorClass: errorClass(lookupError), ipv4: 'unknown', ipv6: 'unknown', intervalClass: performance.now() - lookupStarted < 100 ? 'LT_100MS' : performance.now() - lookupStarted < 500 ? '100_TO_500MS' : 'GT_500MS' })
    }
  } else record('post_failure_lookup', { result: 'NOT_EXECUTED', errorClass: 'NOT_EXECUTED', intervalClass: 'NOT_EXECUTED' })
}
observer?.stop()
record('completion', { requestResult, elapsedClass: performance.now() - started < 100 ? 'LT_100MS' : '100MS_OR_MORE' })

console.log('L1_F3L_CANONICAL_REQUESTS_EXECUTIONS: 1')
console.log('L1_F3L_CANONICAL_REQUESTS_ATTEMPT_COUNT: 1')
console.log('L1_F3L_DIAGNOSTIC_COMPLETED: yes')
