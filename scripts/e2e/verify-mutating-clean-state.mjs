import { loadState } from './lib/mutating-state.mjs'
import { findMutatingNamespace } from './lib/mutating-remote.mjs'
import { writeDiagnostics } from './lib/clean-state-diagnostics.mjs'
import { runBaselineCore } from './verify-baseline.mjs'

export async function runCleanStateCore({ state = loadState(), baselineResult, onRead, namespaceFinder = findMutatingNamespace } = {}) {
  if (!baselineResult?.ok) throw new Error('baseline_core_not_passed')
  if (state.active_flow !== null || Object.values(state.flows).some((flow) => flow.entities?.length || flow.cleanup_required)) {
    throw new Error('pending_state')
  }
  const residuals = await namespaceFinder({ onRead })
  return { ok: residuals.length === 0, classification: residuals.length ? 'MUTATING_RESIDUALS' : 'PASS', residuals: residuals.length }
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]
if (isMain) {
  const fail = (code) => { console.error('MUTATING_CLEAN_STATE: FAIL'); console.error('CATEGORY: ' + code); process.exit(1) }
  if (!process.argv.includes('--confirm-e2e')) fail('missing_confirm_e2e')
  if (process.argv.slice(2).some((arg) => arg !== '--confirm-e2e')) fail('unknown_argument')
  let state
  try { state = loadState() } catch { fail('invalid_mutating_state') }
  const events = []
  try {
    const baselineResult = await runBaselineCore()
    const result = await runCleanStateCore({ state, baselineResult, onRead: (event) => { events.push(event); writeDiagnostics(events, { status: 'RUNNING' }) } })
    writeDiagnostics(events, { status: result.ok ? 'PASS' : 'RESIDUALS', diagnostics_path_class: 'LOCAL_IGNORED_RUNTIME_ARTIFACT' })
    if (!result.ok) fail('mutating_residuals_present')
  } catch (error) {
    const diagnostic = error?.diagnostic
    if (diagnostic) writeDiagnostics([{ ...diagnostic, result: 'FAIL' }], { status: 'FAIL', public_error: 'clean_state_read_failed' })
    else writeDiagnostics([], { status: 'FAIL', public_error: 'clean_state_read_failed', error_class: error?.message === 'baseline_core_not_passed' ? 'BASELINE_VERIFIER_FAILURE' : 'CLEAN_STATE_CORE_FAILURE' })
    fail('clean_state_read_failed')
  }
  console.log('MUTATING_CLEAN_STATE: PASS')
  console.log('MUTATING_RESIDUALS: 0')
}
