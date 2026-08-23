#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import dns from 'node:dns/promises'
import dnsNode from 'node:dns'
import { execFileSync } from 'node:child_process'

const journalPath = path.resolve('.e2e-state/l1-f3h-r2-dns-results.json')
const urlRaw = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
const expectedRef = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
let targetUrl
try { targetUrl = new URL(urlRaw) } catch {}
const targetHost = targetUrl?.hostname ?? ''
const records = []

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
  if (error?.code === 'ETIMEDOUT') return 'TIMEOUT'
  if (error?.code === 'ENODATA') return 'NO_DATA'
  return error?.code ? 'OTHER_ERROR' : 'UNKNOWN'
}
function lookup(name) {
  return dns.lookup(name, { all: true, verbatim: true }).then((addresses) => ({ result: 'PASS', ipv4: addresses.some((entry) => entry.family === 4), ipv6: addresses.some((entry) => entry.family === 6) })).catch((error) => ({ result: 'FAIL', errorClass: errorClass(error), ipv4: 'unknown', ipv6: 'unknown' }))
}
function commandAvailable(command) {
  try { execFileSync('command', ['-v', command], { stdio: 'ignore' }); return true } catch { return false }
}
function osLookup(name) {
  try { execFileSync('getent', ['ahosts', name], { stdio: 'ignore' }); return { result: 'PASS', errorClass: 'NONE' } } catch (error) { return { result: 'FAIL', errorClass: errorClass(error) } }
}
function resolverQuery(command) {
  try {
    const output = execFileSync(command, command === 'resolvectl' ? ['query', targetHost] : [targetHost], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return { result: 'PASS', answerCountClass: output.trim() ? 'ONE_OR_MORE' : 'UNKNOWN', cnamePresent: 'unknown' }
  } catch { return { result: 'OTHER', answerCountClass: 'UNKNOWN', cnamePresent: 'unknown' } }
}

fs.mkdirSync(path.dirname(journalPath), { recursive: true, mode: 0o700 })
persist()
const identity = Boolean(urlRaw) && Boolean(expectedRef) && Boolean(targetUrl) && Boolean(targetHost) && targetUrl.protocol === 'https:' && targetUrl.hostname.endsWith('.supabase.co') && targetUrl.hostname.split('.')[0] === expectedRef
record('identity', { result: identity ? 'PASS' : 'FAIL' })
if (!identity) process.exit(1)

record('control_node_lookup', await lookup('example.com'))
record('control_os_lookup', osLookup('example.com'))
record('e2e_node_lookup', await lookup(targetHost))
record('e2e_os_lookup', osLookup(targetHost))
try { await dns.resolve4(targetHost); record('e2e_resolve4', { result: 'PASS', errorClass: 'NONE' }) } catch (error) { record('e2e_resolve4', { result: 'FAIL', errorClass: errorClass(error) }) }
try { await dns.resolve6(targetHost); record('e2e_resolve6', { result: 'PASS', errorClass: 'NONE' }) } catch (error) { record('e2e_resolve6', { result: 'FAIL', errorClass: errorClass(error) }) }

const resolverTool = ['resolvectl', 'dig', 'nslookup'].find(commandAvailable)
record('resolver_tool', resolverTool ? { available: true, toolClass: resolverTool, ...resolverQuery(resolverTool) } : { available: false, result: 'NOT_APPLICABLE', answerCountClass: 'UNKNOWN', cnamePresent: 'unknown' })

console.log(`L1_F3H_R2_JOURNAL_PATH: ${path.basename(journalPath)}`)
console.log('L1_F3H_R2_DIAGNOSTICS_COMPLETED: yes')
