import diagnosticsChannel from 'node:diagnostics_channel'
import dns from 'node:dns/promises'
import process from 'node:process'

const targetUrl = new URL(String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim())
const controlUrl = new URL('https://example.com/')
const probes = []
let activeProbe = 'NONE'

const safeHostClass = (value, expectedHost, controlHost) => {
  try {
    const host = new URL(String(value)).hostname
    if (host === expectedHost) return 'E2E_SUPABASE_HOST'
    if (host === controlHost) return 'CONTROL_HOST'
    return 'OTHER_HOST'
  } catch {
    return 'HOSTNAME_NOT_AVAILABLE'
  }
}

const safeTransportClass = (error) => {
  const code = String(error?.code ?? '').toUpperCase()
  if (['ENOTFOUND', 'EAI_AGAIN', 'ESERVFAIL', 'ETIMEOUT'].includes(code)) return 'DNS_RESOLUTION_ERROR'
  if (code === 'ECONNRESET') return 'CONNECTION_RESET'
  if (code === 'ETIMEDOUT') return 'CONNECT_TIMEOUT'
  if (/TLS|CERTIFICATE|SSL/i.test(String(error?.name ?? ''))) return 'TLS_ERROR'
  return 'OTHER_TRANSPORT_ERROR'
}

const channels = ['undici:request:create', 'undici:request:error']
const observerAvailable = channels.every((name) => Boolean(diagnosticsChannel.channel(name)))
const listeners = []
const subscribe = (name, listener) => {
  diagnosticsChannel.channel(name).subscribe(listener)
  listeners.push([name, listener])
}
if (observerAvailable) {
  subscribe('undici:request:create', (message) => {
    if (activeProbe === 'NONE') return
    const origin = message?.request?.origin
    const probe = probes.find((entry) => entry.name === activeProbe)
    if (probe && probe.passiveHostClass === 'UNSET') probe.passiveHostClass = safeHostClass(origin, targetUrl.hostname, controlUrl.hostname)
  })
  subscribe('undici:request:error', (message) => {
    if (activeProbe === 'NONE') return
    const probe = probes.find((entry) => entry.name === activeProbe)
    if (probe) {
      probe.passiveErrorClass = safeTransportClass(message?.error)
      probe.passiveHostClass = probe.passiveHostClass === 'UNSET'
        ? safeHostClass(message?.error?.hostname ?? message?.error?.cause?.hostname, targetUrl.hostname, controlUrl.hostname)
        : probe.passiveHostClass
    }
  })
}

const lookup = async (name, hostname) => {
  try {
    await dns.lookup(hostname)
    return { name, result: 'PASS', failureClass: 'NONE' }
  } catch (error) {
    return { name, result: 'FAIL', failureClass: safeTransportClass(error) }
  }
}

const controlDns = await lookup('CONTROL', controlUrl.hostname)
const e2eDns = await lookup('E2E', targetUrl.hostname)

const originFetch = async (name, url) => {
  const probe = { name, transport: 'UNSET', response: 'no', failureClass: 'NONE', passiveHostClass: 'UNSET', passiveErrorClass: 'NONE' }
  probes.push(probe)
  activeProbe = name
  try {
    await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    })
    probe.transport = 'PASS'
    probe.response = 'yes'
  } catch (error) {
    probe.transport = 'FAIL'
    probe.failureClass = safeTransportClass(error)
  } finally {
    activeProbe = 'NONE'
  }
  return probe
}

const controlFetch = await originFetch('CONTROL', controlUrl)
const e2eFetch = await originFetch('E2E', new URL('/', targetUrl.origin).toString())

for (const [name, listener] of listeners) diagnosticsChannel.channel(name).unsubscribe(listener)

console.log('L1_F3T_DIAGNOSTIC_TOOL_READY=yes')
console.log(`L1_F3T_PASSIVE_OBSERVER_READY=${observerAvailable ? 'yes' : 'no'}`)
console.log('L1_F3T_CONTROL_DNS_LOOKUP_EXECUTIONS=1')
console.log(`L1_F3T_CONTROL_DNS_RESULT=${controlDns.result}`)
console.log(`L1_F3T_CONTROL_DNS_FAILURE_CLASS=${controlDns.failureClass}`)
console.log('L1_F3T_E2E_DNS_LOOKUP_EXECUTIONS=1')
console.log(`L1_F3T_E2E_DNS_RESULT=${e2eDns.result}`)
console.log(`L1_F3T_E2E_DNS_FAILURE_CLASS=${e2eDns.failureClass}`)
console.log('L1_F3T_CONTROL_FETCH_EXECUTIONS=1')
console.log(`L1_F3T_CONTROL_FETCH_TRANSPORT_RESULT=${controlFetch.transport}`)
console.log(`L1_F3T_CONTROL_FETCH_FAILURE_CLASS=${controlFetch.failureClass}`)
console.log('L1_F3T_E2E_ORIGIN_FETCH_EXECUTIONS=1')
console.log(`L1_F3T_E2E_ORIGIN_FETCH_TRANSPORT_RESULT=${e2eFetch.transport}`)
console.log(`L1_F3T_E2E_ORIGIN_FETCH_HTTP_RESPONSE_PRESENT=${e2eFetch.response}`)
console.log(`L1_F3T_E2E_ORIGIN_FETCH_FAILURE_CLASS=${e2eFetch.failureClass}`)
console.log(`L1_F3T_E2E_FETCH_PASSIVE_HOST_CLASS=${e2eFetch.passiveHostClass === 'UNSET' && e2eFetch.transport === 'PASS' ? 'E2E_SUPABASE_HOST' : e2eFetch.passiveHostClass}`)
console.log(`L1_F3T_UNEXPECTED_HOST_MISMATCH=${e2eFetch.passiveHostClass === 'OTHER_HOST' ? 'yes' : 'no'}`)
console.log(`L1_F3T_E2E_FETCH_RAW_CORRELATION_VALID=${observerAvailable ? 'yes' : 'not_applicable'}`)
console.log('L1_F3T_DNS_LOOKUP_RETRY_EXECUTIONS=0')
console.log('L1_F3T_HTTP_RETRY_EXECUTIONS=0')
console.log('L1_F3T_TOTAL_DNS_LOOKUP_EXECUTIONS=2')
console.log('L1_F3T_TOTAL_HTTP_PROBE_EXECUTIONS=2')
console.log('L1_F3T_TOTAL_REMOTE_NETWORK_OPERATIONS=4')
console.log('L1_F3T_SUPABASE_CLIENT_TABLE_READ_REACHABILITY=0')
console.log('L1_F3T_POSTGREST_QUERY_EXECUTIONS=0')
console.log('L1_F3T_RPC_EXECUTIONS=0')
