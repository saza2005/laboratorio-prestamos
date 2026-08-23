import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describeSupabaseResult, readWithBoundedRetry } from './lib/clean-state-diagnostics.mjs'

const verifier = fs.readFileSync('scripts/e2e/verify-mutating-flow-l1.mjs', 'utf8')
assert.match(verifier, /readTable/)
assert.match(fs.readFileSync('scripts/e2e/lib/l1-pre-readtable.mjs', 'utf8'), /describeSupabaseResult/)
assert.match(fs.readFileSync('scripts/e2e/lib/l1-pre-readtable.mjs', 'utf8'), /onEvent\(\{ result: 'RESULT_BOUNDARY'/)
assert.match(fs.readFileSync('scripts/e2e/lib/l1-pre-readtable.mjs', 'utf8'), /readTable/)
assert.doesNotMatch(verifier, /Promise\.all\(\[/)

async function complete(reads) {
  const executed = []
  for (const [name, response] of reads) {
    executed.push(name)
    const boundary = describeSupabaseResult(response)
    if (boundary.errorClass !== 'NULL') {
      const error = new Error('supabase_result_error')
      error.l1DiagnosticClass = boundary.errorClass
      await readWithBoundedRetry(async () => { throw error }, { ordinal: executed.length, readClass: name })
    }
  }
  return executed
}

assert.deepEqual(await complete([
  ['L1_PRE_REQUESTS', { data: [{ id: 1 }], error: null }],
  ['L1_PRE_LOANS', { data: [], error: null }],
]), ['L1_PRE_REQUESTS', 'L1_PRE_LOANS'])

await assert.rejects(() => complete([
  ['L1_PRE_REQUESTS', { data: null, error: {} }],
  ['L1_PRE_LOANS', { data: [], error: null }],
]))

await assert.rejects(() => complete([
  ['L1_PRE_REQUESTS', { data: [{ id: 1 }], error: null }],
  ['L1_PRE_LOANS', { data: [], error: {} }],
]))

let reads = 0
await readWithBoundedRetry(async () => { reads += 1; return 'ok' }, { ordinal: 1, readClass: 'COUNTER_ISOLATION' })
assert.equal(reads, 1)

const error = Object.freeze(new Error('immutable'))
const before = error.message
await readWithBoundedRetry(async () => { throw error }, { ordinal: 1, readClass: 'FINGERPRINT_ISOLATION' }).catch(() => {})
assert.equal(error.message, before)

console.log('L1_COMPLETE_TWO_READ_PASS_TEST: PASS')
console.log('L1_COMPLETE_REQUESTS_EMPTY_ERROR_TEST: PASS')
console.log('L1_COMPLETE_LOANS_EMPTY_ERROR_TEST: PASS')
console.log('L1_DIAGNOSTIC_COUNTER_READ_SIDE_EFFECT_REACHABILITY: 0')
console.log('L1_FINGERPRINT_MUTATION_REACHABILITY: 0')
console.log('L1_SAME_PROCESS_SEQUENCE_ISOLATION_TEST: PASS')
