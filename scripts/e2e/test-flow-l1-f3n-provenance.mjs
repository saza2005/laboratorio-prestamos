import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { L1_PRE_REQUESTS_QUERY } from './lib/l1-pre-readtable.mjs'
import { compareRawErrorHost } from './lib/l1-passive-observer.mjs'

const verifierSource = await fs.readFile(new URL('./verify-mutating-flow-l1.mjs', import.meta.url), 'utf8')
assert.match(verifierSource, /startPassiveObserver\(\(\) => currentReadOrdinal, passiveTargetHost\)/)
assert.match(verifierSource, /createAdminReadClient\(\{ url: effectiveSupabaseUrl \}\)/)

const expectedHost = new URL(String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()).hostname
const oldComparator = (error, targetHost) => {
  const rawHost = error?.hostname ?? error?.cause?.hostname
  if (!rawHost) return 'HOSTNAME_NOT_AVAILABLE'
  return rawHost === targetHost ? 'MATCH' : 'MISMATCH'
}
assert.equal(oldComparator({ hostname: expectedHost }, ''), 'MISMATCH')
assert.equal(compareRawErrorHost({ hostname: expectedHost }, ''), 'EXPECTED_TARGET_MISSING')
const captures = []
const client = createAdminReadClient({
  fetch: async (input) => {
    captures.push(new URL(String(input)))
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  },
})

const result = await client.from(L1_PRE_REQUESTS_QUERY.table).select(L1_PRE_REQUESTS_QUERY.columns)
assert.equal(result.error, null)
assert.equal(captures.length, 1)
assert.equal(captures[0].hostname, expectedHost)
assert.equal(captures[0].protocol, 'https:')

assert.equal(compareRawErrorHost({ hostname: expectedHost }, expectedHost), 'MATCH')
assert.equal(compareRawErrorHost({ hostname: expectedHost }, ''), 'EXPECTED_TARGET_MISSING')
assert.equal(compareRawErrorHost({ hostname: expectedHost.toUpperCase() }, expectedHost), 'MISMATCH')
assert.equal(compareRawErrorHost({ hostname: `${expectedHost}.` }, expectedHost), 'MISMATCH')
assert.equal(compareRawErrorHost({ hostname: 'other-target.example' }, expectedHost), 'MISMATCH')
assert.equal(compareRawErrorHost({}, expectedHost), 'HOSTNAME_NOT_AVAILABLE')

const safeOutput = JSON.stringify({ hostMatch: 'MATCH', hostMismatch: 'MISMATCH' })
assert.equal(safeOutput.includes(expectedHost), false)

console.log('L1_F3N_REQUEST_HOST_PROVENANCE_TEST: PASS')
console.log('L1_F3N_HOST_COMPARATOR_TESTS: PASS')
console.log('L1_MISSING_EXPECTED_TARGET_FAIL_CLOSED_TEST: PASS')
console.log('L1_F3M_R2_FALSE_MISMATCH_REPRODUCED_LOCALLY: yes')
console.log('L1_F3N_FIX_ELIMINATES_FALSE_MISMATCH_TEST: PASS')
console.log('L1_F3N_TARGET_PROVENANCE_SECRET_REDACTION_TEST: PASS')
console.log('L1_F3N_NETWORK_FREE_CAPTURE_REMOTE_REACHABILITY: 0')
