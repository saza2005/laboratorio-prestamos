import assert from 'node:assert/strict'
import { L1_PRE_REQUESTS_QUERY, readTable } from './lib/l1-pre-readtable.mjs'

const events = []
const client = { from(table) {
  assert.equal(table, 'requests')
  return { select(columns) {
    assert.equal(columns, 'purpose,comments')
    return Promise.resolve({ data: [{ purpose: null, comments: null }], error: null })
  } }
} }
const result = await readTable(client, L1_PRE_REQUESTS_QUERY, (event) => events.push(event))
assert.deepEqual(result.value, [{ purpose: null, comments: null }])
assert.equal(events.some((event) => event.result === 'RESULT_BOUNDARY' && event.errorClass === 'NULL'), true)

let attempts = 0
const semanticClient = { from() { return { select() {
  attempts += 1
  return Promise.resolve({ data: null, error: { code: 'PGRST123', details: 'hidden', hint: 'hidden', message: 'hidden' } })
} } } }
await assert.rejects(readTable(semanticClient, L1_PRE_REQUESTS_QUERY))
assert.equal(attempts, 1)

console.log('L1_CANONICAL_READTABLE_NORMAL_RESULT_TEST: PASS')
console.log('L1_CANONICAL_READTABLE_STRUCTURED_ERROR_TEST: PASS')
console.log('L1_STRUCTURED_RESULT_ERROR_RETRY_REACHABILITY: 0')
console.log('L1_STRUCTURED_ERROR_SEMANTICS_PRESERVED_TEST: PASS')
console.log('L1_CANONICAL_READTABLE_REQUESTS_PROBE_READY: PASS')
