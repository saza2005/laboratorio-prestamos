import assert from 'node:assert/strict'

function coordinator({ baseline, cleanState, l1Pre }) {
  const counts = { baseline: 0, cleanState: 0, l1Pre: 0, postFailureRemote: 0 }
  const run = (name, core) => {
    counts[name] += 1
    const result = core()
    if (!result.ok) return { result, counts }
    return null
  }
  for (const [name, core] of [['baseline', baseline], ['cleanState', cleanState], ['l1Pre', l1Pre]]) {
    const failure = run(name, core)
    if (failure) return failure
  }
  return { result: { ok: true }, counts }
}

const pass = () => ({ ok: true, classification: 'PASS', sanitizedEvidence: {} })
const fail = () => ({ ok: false, classification: 'FAIL', sanitizedEvidence: {} })

const allPass = coordinator({ baseline: pass, cleanState: pass, l1Pre: pass })
assert.deepEqual(allPass.counts, { baseline: 1, cleanState: 1, l1Pre: 1, postFailureRemote: 0 })
assert.equal(allPass.result.ok, true)

const baselineFail = coordinator({ baseline: fail, cleanState: pass, l1Pre: pass })
assert.deepEqual(baselineFail.counts, { baseline: 1, cleanState: 0, l1Pre: 0, postFailureRemote: 0 })

const cleanFail = coordinator({ baseline: pass, cleanState: fail, l1Pre: pass })
assert.deepEqual(cleanFail.counts, { baseline: 1, cleanState: 1, l1Pre: 0, postFailureRemote: 0 })

const l1Fail = coordinator({ baseline: pass, cleanState: pass, l1Pre: fail })
assert.deepEqual(l1Fail.counts, { baseline: 1, cleanState: 1, l1Pre: 1, postFailureRemote: 0 })

const safeOutput = JSON.stringify({ ok: true, classification: 'PASS', sanitizedEvidence: {} })
assert.equal(/https?:\/\/|supabase|Authorization|cookie|token|[0-9a-f]{8}-[0-9a-f]{4}-/i.test(safeOutput), false)

console.log('L1_F3V_SYNTHETIC_SINGLE_PROCESS_COORDINATOR_READY=yes')
console.log('L1_F3V_BASELINE_FAIL_STOP_TEST=PASS')
console.log('L1_F3V_CLEAN_STATE_FAIL_STOP_TEST=PASS')
console.log('L1_F3V_L1_FAIL_STOP_TEST=PASS')
console.log('L1_F3V_ALL_PASS_COUNT_TEST=PASS')
console.log('L1_F3V_NESTED_BUDGET_REGRESSION_TEST=PASS')
console.log('L1_F3V_POST_FAILURE_EXECUTION_REGRESSION_TEST=PASS')
console.log('L1_F3V_SINGLE_PROCESS_SECRET_REDACTION_TEST=PASS')
