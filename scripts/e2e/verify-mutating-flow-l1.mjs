#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { L1_PRE_LOANS_QUERY, L1_PRE_REQUESTS_QUERY, readTable } from './lib/l1-pre-readtable.mjs'
import { createDiagnosticFetchTap } from './lib/l1-fetch-tap.mjs'
import { startPassiveObserver } from './lib/l1-passive-observer.mjs'

export async function runL1PreCore({ client: injectedClient, passiveObserver: injectedObserver, observerEnabled = process.env.L1_PASSIVE_OBSERVER === '1', fetchTapEnabled = process.env.L1_FETCH_TAP === '1' } = {}) {
let currentReadOrdinal = 0
const fetchEvents = []
const effectiveSupabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
const passiveTargetHost = observerEnabled
  ? new URL(effectiveSupabaseUrl).hostname
  : ''
const passiveObserver = injectedObserver ?? (observerEnabled ? startPassiveObserver(() => currentReadOrdinal, passiveTargetHost) : null)
const observedFetch = fetchTapEnabled
  ? createDiagnosticFetchTap(globalThis.fetch, (event) => {
      fetchEvents.push({ readOrdinal: currentReadOrdinal, ...event })
    })
  : globalThis.fetch
const admin = injectedClient ?? (fetchTapEnabled
  ? createAdminReadClient({ fetch: observedFetch, url: effectiveSupabaseUrl })
  : createAdminReadClient({ url: effectiveSupabaseUrl }))
const readEvents = []
const diagnosticsPath = path.resolve('.e2e-state/runtime/l1-pre-read-diagnostics.json')

async function readL1Table(query) {
  currentReadOrdinal = query === L1_PRE_REQUESTS_QUERY ? 1 : 2
  try {
    const result = await readTable(admin, { ...query, ordinal: currentReadOrdinal }, (event) => readEvents.push({ ordinal: currentReadOrdinal, ...event }), { transportObserver: passiveObserver })
    return result.value
  } catch (error) {
    writeDiagnostics({ result: 'FAIL', failure: error.diagnostic ?? { errorClass: 'UNKNOWN_REMOTE_READ_ERROR' } })
    throw Object.assign(new Error('l1_pre_read_failed'), { diagnostic: error.diagnostic })
  }
}

const requests = await readL1Table(L1_PRE_REQUESTS_QUERY)
const loans = await readL1Table(L1_PRE_LOANS_QUERY)
writeDiagnostics({ result: 'PASS', failure: null })

const marker = /E2E_MUT_(REQ|LOAN)_L1_/i
const requestHits = requests.filter((row) => marker.test(`${row.purpose ?? ''} ${row.comments ?? ''}`)).length
const loanHits = loans.filter((row) => marker.test(row.notes ?? '')).length
if (requestHits !== 0 || loanHits !== 0) throw new Error('l1_namespace_residual')
return { ok: true, classification: 'PASS', requests, loans, requestHits, loanHits, attempts: readEvents.filter((event) => event.result === 'FAIL').length }

function writeDiagnostics(summary) {
  fs.mkdirSync(path.dirname(diagnosticsPath), { recursive: true, mode: 0o700 })
  const payload = {
    version: 1,
    events: readEvents,
    fetch_events: fetchEvents,
    passive_events: passiveObserver?.events ?? [],
    summary: {
      ...summary,
      remote_writes: 0,
      business_rpc_executions: 0,
    },
  }
  const temp = diagnosticsPath + '.tmp-' + process.pid
  fs.writeFileSync(temp, JSON.stringify(payload, null, 2) + '\n', { mode: 0o600 })
  fs.renameSync(temp, diagnosticsPath)
  passiveObserver?.stop()
}

}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]
if (isMain) {
  const args = new Set(process.argv.slice(2))
  try {
    if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--stage=pre')) throw new Error('pre_stage_only')
    await runL1PreCore()
    console.log('L1_VERIFIER_PRE: PASS')
    console.log('L1_REQUEST_NAMESPACE_RESIDUALS: 0')
    console.log('L1_LOAN_NAMESPACE_RESIDUALS: 0')
    console.log('REMOTE_WRITES: 0')
  } catch (error) {
    console.error('L1_VERIFIER_PRE: FAIL\nCATEGORY: ' + (error?.message ?? 'l1_pre_failed'))
    process.exit(1)
  }
}
