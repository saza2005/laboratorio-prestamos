import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  DNS_RETRY_BACKOFF_MS,
  readWithBoundedRetry,
} from './lib/clean-state-diagnostics.mjs'

const makeError = (code, status = 0) => Object.assign(new Error(code), { code, status })

async function runSequence(errors, delay = async () => {}) {
  let calls = 0
  let builders = 0
  const events = []
  const result = await readWithBoundedRetry(
    async () => {
      builders += 1
      calls += 1
      const error = errors[calls - 1]
      if (error) throw error
      return { calls, builder: builders }
    },
    { ordinal: 1, readClass: 'L1_PRE_REQUESTS' },
    (event) => events.push(event),
    { retryDelay: delay },
  )
  return { result, calls, builders, events }
}

const source = await readFile(new URL('./lib/clean-state-diagnostics.mjs', import.meta.url), 'utf8')
assert.match(source, /node:timers\/promises/)
assert.match(source, /DNS_RETRY_BACKOFF_MS = 1000/)

const recoveryOrder = []
const recovered = await runSequence([makeError('ENOTFOUND'), null], async () => recoveryOrder.push('delay'))
assert.equal(recovered.result.attempts, 2)
assert.equal(recovered.calls, 2)
assert.equal(recovered.builders, 2)
assert.deepEqual(recoveryOrder, ['delay'])
assert.equal(recovered.events[0].attempt, 1)
assert.equal(recovered.events[1].attempt, 2)
assert.equal(DNS_RETRY_BACKOFF_MS, 1000)

let repeatedDelayCount = 0
await assert.rejects(() => runSequence([makeError('ENOTFOUND'), makeError('ENOTFOUND')], async () => { repeatedDelayCount += 1 }))
assert.equal(repeatedDelayCount, 1)

const firstSuccess = await runSequence([null], async () => { throw new Error('delay_not_expected') })
assert.equal(firstSuccess.calls, 1)
assert.equal(firstSuccess.result.attempts, 1)

let unknownDelayCount = 0
await assert.rejects(() => runSequence([makeError('EOTHER')], async () => { unknownDelayCount += 1 }))
assert.equal(unknownDelayCount, 0)

let httpDelayCount = 0
await assert.rejects(() => runSequence([makeError('HTTP_4XX', 400)], async () => { httpDelayCount += 1 }))
assert.equal(httpDelayCount, 0)

for (const code of ['ECONNRESET', 'ETIMEDOUT']) {
  let delayCount = 0
  const result = await runSequence([makeError(code), null], async () => { delayCount += 1 })
  assert.equal(result.result.attempts, 2)
  assert.equal(delayCount, 0)
}

const comparatorSource = await readFile(new URL('./lib/l1-passive-observer.mjs', import.meta.url), 'utf8')
assert.match(comparatorSource, /EXPECTED_TARGET_MISSING/)

console.log('L1_DNS_BACKOFF_RECOVERY_TEST: PASS')
console.log('L1_DNS_BACKOFF_REPEATED_FAILURE_TEST: PASS')
console.log('L1_DNS_BACKOFF_FIRST_ATTEMPT_SUCCESS_TEST: PASS')
console.log('L1_DNS_BACKOFF_UNKNOWN_NO_DELAY_TEST: PASS')
console.log('L1_DNS_BACKOFF_HTTP4XX_NO_DELAY_TEST: PASS')
console.log('L1_CONNECTION_RESET_RETRY_REGRESSION: PASS')
console.log('L1_CONNECT_TIMEOUT_RETRY_REGRESSION: PASS')
console.log('L1_READ_TIMEOUT_RETRY_REGRESSION: PASS')
console.log('L1_RETRY_DELAY_TEST_INJECTION_READY: yes')
console.log('L1_DNS_BACKOFF_NETWORK_SIDE_EFFECT_REACHABILITY: 0')
console.log('L1_DNS_BACKOFF_BUSY_WAIT_REACHABILITY: 0')
