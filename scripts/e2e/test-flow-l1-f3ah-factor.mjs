import assert from 'node:assert/strict'

const factor = process.env.F3AH_FACTOR ?? 'UNKNOWN'
if (factor === 'PREIMPORT_OBSERVER') await import('./lib/l1-passive-observer.mjs')
if (factor === 'PREIMPORT_FORMATTER') await import('./lib/baseline-result-formatter.mjs')
if (factor === 'PREIMPORT_BASELINE') await import('./verify-baseline.mjs')

const { runSingleProcessPreflight } = await import('./verify-mutating-l1-single-process-preflight.mjs')
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('NETWORK_KILLSWITCH') }
let result
try {
  const gates = factor === 'NO_LOCAL_GATES'
    ? { freezeGate: async () => ({ ok: true }), isolationGate: async () => ({ ok: true }), storageGate: async () => ({ ok: true }) }
    : {}
  result = await runSingleProcessPreflight(gates)
} finally {
  globalThis.fetch = originalFetch
}
assert.equal(result.counters.baseline, 1)
assert.equal(result.counters.cleanState, 0)
assert.equal(result.counters.l1Pre, 0)
console.log(`FACTOR=${factor}`)
console.log(`RESULT_STAGE=${result.baseline?.failure?.stage ?? 'UNKNOWN'}`)
console.log(`RESULT_CLASS=${result.baseline?.failure?.failureClass ?? 'UNKNOWN'}`)
console.log('NETWORK_OPERATIONS=0')
