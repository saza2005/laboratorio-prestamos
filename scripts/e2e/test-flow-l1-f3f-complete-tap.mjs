import assert from 'node:assert/strict'
import { PostgrestClient } from '@supabase/postgrest-js'
import { createDiagnosticFetchTap } from './lib/l1-fetch-tap.mjs'
import { L1_PRE_LOANS_QUERY, L1_PRE_REQUESTS_QUERY, readTable } from './lib/l1-pre-readtable.mjs'
import { readWithBoundedRetry } from './lib/clean-state-diagnostics.mjs'

const ok = () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
const server = () => new Response(JSON.stringify({ code: 'PGRST123', message: 'generic', details: 'generic', hint: null }), { status: 400, headers: { 'content-type': 'application/json' } })

async function complete(fetchImpl) {
  const events = []
  const client = new PostgrestClient('https://example.invalid', { fetch: createDiagnosticFetchTap(fetchImpl, (event) => events.push(event)) })
  const requests = await readTable(client, L1_PRE_REQUESTS_QUERY)
  const loans = await readTable(client, L1_PRE_LOANS_QUERY)
  return { requests, loans, events }
}

const success = await complete(async () => ok())
assert.equal(success.requests.value.length, 0)
assert.equal(success.loans.value.length, 0)
assert.equal(success.events.length, 2)

let rejectionCalls = 0
await assert.rejects(() => complete(async () => {
  rejectionCalls += 1
  throw new TypeError('fetch failed')
}))
assert.equal(rejectionCalls, 1)

let transientCalls = 0
const transient = await readWithBoundedRetry(async () => {
  transientCalls += 1
  if (transientCalls === 1) throw Object.assign(new Error('reset'), { code: 'ECONNRESET' })
  return []
}, { ordinal: 1, readClass: 'L1_PRE_REQUESTS' })
assert.equal(transient.value.length, 0)
assert.equal(transient.attempts, 2)
const transientComplete = await complete(async () => {
  transientCalls += 1
  return ok()
})
assert.equal(transientComplete.events.length, 2)
assert.equal(transientCalls, 4)

let unknownCalls = 0
await assert.rejects(() => complete(async () => {
  unknownCalls += 1
  throw new Error('unknown')
}))
assert.equal(unknownCalls, 1)

let serverCalls = 0
await assert.rejects(() => complete(async () => {
  serverCalls += 1
  return server()
}))
assert.equal(serverCalls, 1)

console.log('L1_COMPLETE_WITH_TAP_TWO_READ_SUCCESS_TEST: PASS')
console.log('L1_COMPLETE_WITH_TAP_REQUESTS_REJECTION_TEST: PASS')
console.log('L1_COMPLETE_WITH_TAP_TRANSIENT_RECOVERY_TEST: PASS')
console.log('L1_COMPLETE_WITH_TAP_UNKNOWN_REJECTION_TEST: PASS')
console.log('L1_COMPLETE_WITH_TAP_HTTP_4XX_TEST: PASS')
