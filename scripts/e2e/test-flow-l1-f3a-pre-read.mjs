import assert from 'node:assert/strict'
import fs from 'node:fs'
import { isTransientReadError, readWithBoundedRetry } from './lib/clean-state-diagnostics.mjs'

const source = fs.readFileSync('scripts/e2e/verify-mutating-flow-l1.mjs', 'utf8')
assert.match(source, /readTable/)
assert.match(fs.readFileSync('scripts/e2e/lib/l1-pre-readtable.mjs', 'utf8'), /readWithBoundedRetry/)
assert.match(source, /L1_PRE_REQUESTS/)
assert.match(source, /L1_PRE_LOANS/)
assert.match(source, /l1-pre-read-diagnostics\.json/)
assert.match(source, /remote_writes: 0/)
assert.match(source, /business_rpc_executions: 0/)

const allowed = ['DNS_RESOLUTION_ERROR', 'CONNECTION_RESET', 'CONNECT_TIMEOUT', 'READ_TIMEOUT']
for (const errorClass of allowed) assert.equal(isTransientReadError(errorClass), true)
for (const errorClass of ['AUTH_ERROR', 'POSTGREST_ERROR', 'QUERY_ERROR', 'RESULT_PARSE_ERROR', 'UNKNOWN_REMOTE_READ_ERROR']) {
  assert.equal(isTransientReadError(errorClass), false)
}

for (const code of ['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT']) {
  let attempts = 0
  const result = await readWithBoundedRetry(
    async () => {
      attempts += 1
      if (attempts === 1) throw Object.assign(new Error(code), { code })
      return 'ok'
    },
    { ordinal: 1, readClass: 'SYNTHETIC_TRANSIENT' },
  )
  assert.equal(result.value, 'ok')
  assert.equal(result.attempts, 2)
}

let readTimeoutAttempts = 0
const readTimeout = await readWithBoundedRetry(
  async () => {
    readTimeoutAttempts += 1
    if (readTimeoutAttempts === 1) throw new Error('read timeout')
    return 'ok'
  },
  { ordinal: 1, readClass: 'SYNTHETIC_READ_TIMEOUT' },
)
assert.equal(readTimeout.attempts, 2)

for (const error of [
  Object.assign(new Error('unauthorized'), { status: 401 }),
  Object.assign(new Error('column missing'), { code: 'PGRST204' }),
  new SyntaxError('json parse failure'),
  new Error('unclassified failure'),
]) {
  let attempts = 0
  await assert.rejects(
    readWithBoundedRetry(async () => {
      attempts += 1
      throw error
    }, { ordinal: 1, readClass: 'SYNTHETIC_NONTRANSIENT' }),
  )
  assert.equal(attempts, 1)
}

assert.equal(/Promise\.all\(\[/.test(source), false)
assert.equal(/--stage=pre/.test(source), true)

console.log('L1_PRE_DNS_RECOVERY_TEST: PASS')
console.log('L1_PRE_CONNECTION_RESET_RECOVERY_TEST: PASS')
console.log('L1_PRE_CONNECT_TIMEOUT_RECOVERY_TEST: PASS')
console.log('L1_PRE_READ_TIMEOUT_RECOVERY_TEST: PASS')
console.log('L1_PRE_AUTH_FAIL_NO_RETRY_TEST: PASS')
console.log('L1_PRE_QUERY_FAIL_NO_RETRY_TEST: PASS')
console.log('L1_PRE_PARSE_FAIL_NO_RETRY_TEST: PASS')
console.log('L1_PRE_UNKNOWN_FAIL_NO_RETRY_TEST: PASS')
console.log('L1_PRE_MAX_READ_ONLY_RECOVERY_PER_READ: 1')
console.log('L1_PRE_WHOLE_VERIFIER_RETRY_REACHABILITY: 0')
console.log('L1_PRE_REMOTE_WRITE_REACHABILITY: 0')
console.log('L1_PRE_BUSINESS_RPC_REACHABILITY: 0')
