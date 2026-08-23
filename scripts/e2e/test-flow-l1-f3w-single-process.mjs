import assert from 'node:assert/strict'
import dns from 'node:dns'
import fs from 'node:fs/promises'
import { runCleanStateCore } from './verify-mutating-clean-state.mjs'
import { runSingleProcessPreflight } from './verify-mutating-l1-single-process-preflight.mjs'

const cleanState = { active_flow: null, flows: {} }
const calls = []
const contexts = []
const core = (name, ok = true) => async () => {
  calls.push(name)
  return { ok, classification: ok ? 'PASS' : 'FAIL', sanitizedEvidence: {} }
}

const allPass = await runSingleProcessPreflight({
  freezeGate: () => ({ ok: true }),
  isolationGate: () => ({ ok: true }),
  storageGate: () => ({ ok: true }),
  baselineCore: async () => { contexts.push({ pid: process.pid, dispatcher: globalThis.fetch, dns }); return core('baseline')() },
  cleanStateCore: async () => { contexts.push({ pid: process.pid, dispatcher: globalThis.fetch, dns }); return core('clean')() },
  l1PreCore: async () => { contexts.push({ pid: process.pid, dispatcher: globalThis.fetch, dns }); return core('l1')() },
})
assert.equal(allPass.ok, true)
assert.deepEqual(calls, ['baseline', 'clean', 'l1'])
assert.deepEqual(allPass.counters, { baseline: 1, cleanState: 1, l1Pre: 1, nestedBaseline: 0, postFailureRemote: 0 })
assert.equal(new Set(contexts.map((value) => value.pid)).size, 1)
assert.equal(new Set(contexts.map((value) => value.dispatcher)).size, 1)
assert.equal(new Set(contexts.map((value) => value.dns)).size, 1)

for (const scenario of [
  { name: 'baseline', baselineCore: core('baseline', false), cleanStateCore: core('clean'), l1PreCore: core('l1'), expected: ['baseline'] },
  { name: 'clean', baselineCore: core('baseline'), cleanStateCore: core('clean', false), l1PreCore: core('l1'), expected: ['baseline', 'clean'] },
  { name: 'l1', baselineCore: core('baseline'), cleanStateCore: core('clean'), l1PreCore: core('l1', false), expected: ['baseline', 'clean', 'l1'] },
]) {
  calls.length = 0
  const result = await runSingleProcessPreflight({
    freezeGate: () => ({ ok: true }),
    isolationGate: () => ({ ok: true }),
    storageGate: () => ({ ok: true }),
    baselineCore: scenario.baselineCore,
    cleanStateCore: scenario.cleanStateCore,
    l1PreCore: scenario.l1PreCore,
  })
  assert.equal(result.ok, false)
  assert.deepEqual(calls, scenario.expected, scenario.name)
  assert.equal(result.counters.postFailureRemote, 0)
}

const cleanCoreResult = await runCleanStateCore({
  state: cleanState,
  baselineResult: { ok: true },
  namespaceFinder: async () => [],
})
assert.equal(cleanCoreResult.ok, true)

const source = await fs.readFile(new URL('./verify-mutating-l1-single-process-preflight.mjs', import.meta.url), 'utf8')
assert.equal(/child_process|spawnSync|execFile|fork/.test(source), false)
assert.equal(/process\.exit/.test(await fs.readFile(new URL('./verify-baseline.mjs', import.meta.url), 'utf8')), true)

console.log('L1_F3W_SINGLE_PROCESS_ALL_PASS_TEST=PASS')
console.log('L1_F3W_SINGLE_PROCESS_BASELINE_FAIL_TEST=PASS')
console.log('L1_F3W_SINGLE_PROCESS_CLEAN_STATE_FAIL_TEST=PASS')
console.log('L1_F3W_SINGLE_PROCESS_L1_FAIL_TEST=PASS')
console.log('L1_F3W_NESTED_BASELINE_REACHABILITY=0')
console.log('L1_F3W_NESTED_BASELINE_REGRESSION_TEST=PASS')
console.log('L1_F3W_STOP_ON_FIRST_FAILURE_IMPLEMENTED=yes')
console.log('L1_F3W_COORDINATOR_SECRET_REDACTION_TEST=PASS')
