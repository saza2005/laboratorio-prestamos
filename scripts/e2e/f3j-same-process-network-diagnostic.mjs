#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns/promises'
import dnsNode from 'node:dns'
import net from 'node:net'
import tls from 'node:tls'
import diagnosticsChannel from 'node:diagnostics_channel'

const journalPath = path.resolve('.e2e-state/l1-f3j-network-results.json')
const rawUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
let targetUrl
try { targetUrl = new URL(rawUrl) } catch {}
const targetHost = targetUrl?.hostname ?? ''
const records = []
const undici = { beforeConnect: false, requestCreate: false, requestError: false, connectHostMatches: 'not_available', errorHostMatches: 'not_available', errorClass: 'NONE' }

function persist() {
  fs.mkdirSync(path.dirname(journalPath), { recursive: true, mode: 0o700 })
  const temp = `${journalPath}.tmp-${process.pid}`
  fs.writeFileSync(temp, JSON.stringify({ version: 1, records }, null, 2) + '\n', { mode: 0o600 })
  fs.renameSync(temp, journalPath)
}
function record(name, result) {
  records.push({ name, ...result })
  persist()
}
function errorClass(error) {
  if (error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') return 'DNS_RESOLUTION_ERROR'
  if (error?.code === 'ECONNRESET') return 'CONNECTION_RESET'
  if (error?.code === 'ECONNREFUSED') return 'CONNECTION_REFUSED'
  if (error?.code === 'ETIMEDOUT') return 'TIMEOUT'
  if (error?.name === 'AbortError') return 'ABORT'
  return error?.code ? 'OTHER_ERROR' : 'UNKNOWN'
}
function codeClass(error) { return error?.code ? (['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code) ? error.code : 'OTHER_CODE') : 'ABSENT' }
function syscallClass(error) { return error?.syscall ? (['getaddrinfo', 'connect'].includes(String(error.syscall).toLowerCase()) ? String(error.syscall).toUpperCase() : 'OTHER_SYSCALL') : 'ABSENT' }
function hostMatches(value) {
  try { return new URL(String(value)).hostname === targetHost } catch { return 'not_available' }
}
function safeStatus(status) {
  if (!Number.isFinite(status)) return 'OTHER'
  if (status >= 500) return 'HTTP_5XX'
  if (status >= 400) return 'HTTP_4XX'
  if (status >= 300) return 'HTTP_3XX'
  if (status >= 200) return 'HTTP_2XX'
  return 'OTHER'
}
function observeUndici() {
  const subscriptions = [
    ['undici:client:beforeConnect', (message) => {
      undici.beforeConnect = true
      const hostname = message?.connectParams?.hostname
      if (hostname) undici.connectHostMatches = hostname === targetHost ? 'yes' : 'no'
    }],
    ['undici:request:create', (message) => {
      undici.requestCreate = true
      const origin = message?.request?.origin
      if (origin) undici.requestHostMatches = hostMatches(origin)
    }],
    ['undici:request:error', (message) => {
      undici.requestError = true
      const origin = message?.request?.origin
      if (origin) undici.errorHostMatches = hostMatches(origin)
      undici.errorClass = errorClass(message?.error)
    }],
  ]
  for (const [name, listener] of subscriptions) diagnosticsChannel.channel(name).subscribe(listener)
  return () => subscriptions.forEach(([name, listener]) => diagnosticsChannel.channel(name).unsubscribe(listener))
}

fs.mkdirSync(path.dirname(journalPath), { recursive: true, mode: 0o700 })
persist()
const identity = Boolean(targetUrl && targetUrl.protocol === 'https:' && targetHost && targetUrl.hostname.endsWith('.supabase.co'))
record('identity', { result: identity ? 'PASS' : 'FAIL' })
if (!identity) process.exit(1)

const cleanupObserver = observeUndici()
const lookupStarted = Date.now()
try {
  const addresses = await dns.lookup(targetHost, { all: true })
  record('lookup_all', { result: 'PASS', addressCountClass: addresses.length === 0 ? 'ZERO' : addresses.length === 1 ? 'ONE' : 'MULTIPLE', ipv4: addresses.some((entry) => entry.family === 4), ipv6: addresses.some((entry) => entry.family === 6), errorClass: 'NONE', durationClass: Date.now() - lookupStarted < 100 ? 'LT_100MS' : '100MS_OR_MORE' })
} catch (error) {
  record('lookup_all', { result: 'FAIL', addressCountClass: 'ZERO', ipv4: 'unknown', ipv6: 'unknown', errorClass: errorClass(error), durationClass: Date.now() - lookupStarted < 100 ? 'LT_100MS' : '100MS_OR_MORE' })
}

await new Promise((resolve) => {
  const socket = tls.connect({ host: targetHost, port: 443, servername: targetHost })
  let settled = false
  const finish = (result) => { if (settled) return; settled = true; record('tls_connect', result); socket.destroy(); resolve() }
  socket.once('secureConnect', () => finish({ result: 'PASS', errorClass: 'NONE', codeClass: 'ABSENT', syscallClass: 'ABSENT', hostMatches: 'yes' }))
  socket.once('error', (error) => finish({ result: 'FAIL', errorClass: errorClass(error), codeClass: codeClass(error), syscallClass: syscallClass(error), hostMatches: error?.hostname ? error.hostname === targetHost ? 'yes' : 'no' : 'not_available' }))
  socket.setTimeout(5000, () => finish({ result: 'FAIL', errorClass: 'TIMEOUT', codeClass: 'ABSENT', syscallClass: 'ABSENT', hostMatches: 'not_available' }))
})

try {
  const response = await fetch(targetUrl.origin, { method: 'HEAD', redirect: 'manual' })
  record('fetch', { result: 'RESOLVED', statusClass: safeStatus(response.status), rawErrorClass: 'NONE', codeClass: 'ABSENT', syscallClass: 'ABSENT', hostMatches: 'not_available' })
} catch (error) {
  record('fetch', { result: 'REJECTED', statusClass: 'NOT_APPLICABLE', rawErrorClass: errorClass(error), codeClass: codeClass(error), syscallClass: syscallClass(error), hostMatches: error?.hostname ? error.hostname === targetHost ? 'yes' : 'no' : 'not_available' })
}

cleanupObserver()
record('undici_observer', { ready: true, mutationReachability: 0, beforeConnect: undici.beforeConnect, requestCreate: undici.requestCreate, connectHostMatches: undici.connectHostMatches, connectErrorObserved: undici.requestError, connectErrorClass: undici.errorClass, errorHostMatches: undici.errorHostMatches })
record('runtime_defaults', { dnsOrder: dnsNode.getDefaultResultOrder(), autoSelectFamily: net.getDefaultAutoSelectFamily?.() ?? 'NOT_AVAILABLE', autoSelectFamilyAttemptTimeoutClass: typeof net.getDefaultAutoSelectFamilyAttemptTimeout === 'function' ? 'CONFIGURED_OR_DEFAULT' : 'NOT_AVAILABLE' })
record('environment_class', { nodeOptionsPresent: Boolean(process.env.NODE_OPTIONS), nodeUseEnvProxyPresent: Boolean(process.env.NODE_USE_ENV_PROXY), proxyPresent: ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'].some((key) => Boolean(process.env[key])), customFetch: false, customDispatcher: false, globalDispatcherOverride: false, fetchResolverImplementationClass: 'NODE_BUILTIN_UNDICI_FETCH' })

console.log('L1_F3J_CORE_DIAGNOSTICS_SINGLE_PROCESS: yes')
console.log('L1_F3J_DIAGNOSTICS_COMPLETED: yes')
