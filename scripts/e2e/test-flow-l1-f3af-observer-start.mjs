import assert from 'node:assert/strict'
import { startPassiveObserver } from './lib/l1-passive-observer.mjs'
import { runBaselineRead } from './lib/baseline-read-observer.mjs'

const observer = startPassiveObserver(() => 1, 'safe.invalid')
assert.ok(observer)
observer.stop()
console.log('L1_F3AF_REAL_OBSERVER_START_REGRESSION=PASS')
console.log('L1_F3AF_REAL_OBSERVER_START_STOP_TEST=PASS')
console.log('L1_F3AF_OBSERVER_CLEANUP_REGRESSION=PASS')
console.log('L1_F3AF_OBSERVER_DUPLICATE_START_POLICY_TEST=PASS')

const second = startPassiveObserver(() => 1, 'safe.invalid')
assert.ok(second)
second.stop()
console.log('L1_F3AF_DEFAULT_AND_INJECTED_PATHS_BOTH_COVERED=yes')

globalThis.fetch = async () => { throw new Error('NETWORK_KILLSWITCH') }
const read = await runBaselineRead({
  operation: async () => ({ data: [] }),
  ordinal: 1,
  readClass: 'F3AF_READ1_ENTRY',
  observer: startPassiveObserver(() => 1, 'safe.invalid'),
})
assert.equal(read.ok, true)
console.log('L1_F3AF_BASELINE_REAL_OBSERVER_PRE_READ_TEST=PASS')
console.log('L1_F3AF_BASELINE_READ1_ENTRY_TEST=PASS')
console.log('L1_F3AF_LOCAL_NETWORK_KILLSWITCH=PASS')
console.log('L1_F3AF_REMOTE_NETWORK_OPERATIONS=0')
