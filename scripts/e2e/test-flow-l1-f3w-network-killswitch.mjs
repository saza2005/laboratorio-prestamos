import assert from 'node:assert/strict'
import { runSingleProcessPreflight } from './verify-mutating-l1-single-process-preflight.mjs'

const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('F3W_NETWORK_KILLSWITCH_TRIPPED') }
try {
  const result = await runSingleProcessPreflight({
    freezeGate: () => ({ ok: true }),
    isolationGate: () => ({ ok: true }),
    storageGate: () => ({ ok: true }),
    baselineCore: async () => ({ ok: true, classification: 'PASS' }),
    cleanStateCore: async () => ({ ok: true, classification: 'PASS' }),
    l1PreCore: async () => ({ ok: true, classification: 'PASS' }),
  })
  assert.equal(result.ok, true)
  assert.deepEqual(result.counters, { baseline: 1, cleanState: 1, l1Pre: 1, nestedBaseline: 0, postFailureRemote: 0 })
} finally {
  globalThis.fetch = originalFetch
}

console.log('L1_F3W_LOCAL_TEST_NETWORK_KILLSWITCH=PASS')
console.log('L1_F3W_REMOTE_NETWORK_OPERATIONS=0')
