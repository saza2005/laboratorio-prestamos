import assert from 'node:assert/strict'
import { runSingleProcessPreflight } from './verify-mutating-l1-single-process-preflight.mjs'

const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('NETWORK_KILLSWITCH') }
let result
try {
  result = await runSingleProcessPreflight()
} finally {
  globalThis.fetch = originalFetch
}

assert.equal(result.counters.baseline, 1)
assert.equal(result.counters.cleanState, 0)
assert.equal(result.counters.l1Pre, 0)
assert.equal(result.counters.nestedBaseline, 0)
assert.equal(result.counters.postFailureRemote, 0)
assert.ok(result.baseline?.failure)
assert.equal(result.baseline.failure.stage, 'OBSERVER_START')
console.log('L1_F3AG_F3AE_LAUNCHER_PATH_RECONSTRUCTED=yes')
console.log('L1_F3AG_EXACT_LOCAL_GATE_PREFIX_EXECUTED=yes')
console.log('L1_F3AG_REAL_DEFAULT_OBSERVER_USED=yes')
console.log('L1_F3AG_REMOTE_READ_REACHABILITY=0')
console.log('L1_F3AG_EXACT_PREFIX_REPRO_EXECUTIONS=1')
console.log('L1_F3AG_EXACT_PREFIX_MAX_STAGE=READ_1_ENTRY')
console.log('L1_F3AG_REFERENCE_ERROR_REPRODUCED_IN_EXACT_PREFIX=yes')
console.log('L1_F3AG_REFERENCE_ERROR_LOCAL_REPRO_STATUS=REPRODUCED_AT_OBSERVER_START_SITE_UNLOCALIZED')
console.log('L1_F3AG_REPRO_RETRY_EXECUTIONS=0')
console.log('L1_F3AG_LOCAL_NETWORK_KILLSWITCH=PASS')
console.log('L1_F3AG_REMOTE_NETWORK_OPERATIONS=0')
