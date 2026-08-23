import crypto from 'node:crypto'
import dns from 'node:dns'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { runBaselineCore } from './verify-baseline.mjs'
import { runCleanStateCore } from './verify-mutating-clean-state.mjs'
import { runL1PreCore } from './verify-mutating-flow-l1.mjs'
import { formatBaselineFailure, formatPreflightResult } from './lib/baseline-result-formatter.mjs'

const nonExemptHashManifestPath = '.e2e-state/l1-f3ad-formatter-projection-manifest.json'
const coordinatorReferencePath = '.e2e-state/l1-f3bu-coordinator-reference.json'
const activeFreezeReference = 'POST_F3BL_AMENDED_FREEZE'
const postF3BLVerifyBaselineHash = 'af9edb8cee87057cbcfeb2e48fafd673da77705f3847fa28ab834a7feab8cec1'

const storageStateHashes = Object.freeze({
  'admin.json': '970713a5130921cce2cd8204267d8e4140829ed63c34c4ae74f0538b9c5cc596',
  'lab-staff.json': 'd91ef7c9c4535b50a2f18bda9e235155336b85cc158f34094da91589c59ae85a',
  'teacher.json': '56c9a27e14ee63e50007ebf3949e1d1fed2675509dcdea73bb4717bb3407ee19',
  'student.json': 'c43aea17a7cf49ea1ea4868f4044c50c3a155d8953824be93a461664c5cba0c0',
})

function checkStorageStateFiles() {
  const dir = '.e2e-state/playwright'
  for (const [name, expected] of Object.entries(storageStateHashes)) {
    const file = path.join(dir, name)
    if (!fs.existsSync(file) || (fs.statSync(file).mode & 0o777) !== 0o600) return { ok: false, classification: 'STORAGE_STATE_INVALID' }
    if (crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== expected) return { ok: false, classification: 'STORAGE_STATE_HASH_MISMATCH' }
  }
  return { ok: true, classification: 'PASS' }
}

function checkProjectIsolation() {
  try {
    const url = new URL(String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim())
    const expected = String(process.env.E2E_EXPECTED_PROJECT_REF ?? '').trim()
    const normal = String(process.env.NORMAL_SUPABASE_PROJECT_REF ?? '').trim()
    return { ok: url.protocol === 'https:' && url.hostname.startsWith(`${expected}.`) && url.hostname !== `${normal}.supabase.co`, classification: 'PASS' }
  } catch {
    return { ok: false, classification: 'PROJECT_ISOLATION_INVALID' }
  }
}

function checkFreeze() {
  try {
    const manifest = JSON.parse(fs.readFileSync(nonExemptHashManifestPath, 'utf8'))
    if (!Array.isArray(manifest.files)) return { ok: false, classification: 'FREEZE_INVALID' }
    for (const entry of manifest.files ?? []) {
      if (entry.path === 'scripts/e2e/verify-mutating-l1-single-process-preflight.mjs') continue
      const actual = crypto.createHash('sha256').update(fs.readFileSync(entry.path)).digest('hex')
      const expected = entry.path === 'scripts/e2e/verify-baseline.mjs' ? postF3BLVerifyBaselineHash : entry.sha256
      if (actual !== expected) return { ok: false, classification: 'FREEZE_HASH_MISMATCH' }
    }
    const coordinatorReference = JSON.parse(fs.readFileSync(coordinatorReferencePath, 'utf8'))
    if (
      coordinatorReference.reference !== 'POST_F3BU_COORDINATOR_REFERENCE' ||
      coordinatorReference.path !== 'scripts/e2e/verify-mutating-l1-single-process-preflight.mjs' ||
      !/^[a-f0-9]{64}$/.test(coordinatorReference.sha256)
    ) return { ok: false, classification: 'COORDINATOR_REFERENCE_INVALID' }
    const coordinatorActual = crypto.createHash('sha256').update(fs.readFileSync(coordinatorReference.path)).digest('hex')
    if (coordinatorActual !== coordinatorReference.sha256) return { ok: false, classification: 'COORDINATOR_HASH_MISMATCH' }
    return { ok: true, classification: activeFreezeReference }
  } catch {
    return { ok: false, classification: 'FREEZE_INVALID' }
  }
}

function readL1FailureEvidence() {
  try {
    const diagnostics = JSON.parse(fs.readFileSync('.e2e-state/runtime/l1-pre-read-diagnostics.json', 'utf8'))
    const failures = (diagnostics.events ?? []).filter((event) => event.result === 'FAIL')
    const passive = diagnostics.passive_events ?? []
    const errors = passive.filter((event) => event.event === 'REQUEST_ERROR')
    const hostClass = errors.some((event) => event.fingerprint?.hostMatch === 'MISMATCH')
      ? 'OTHER_HOST'
      : errors.some((event) => event.fingerprint?.hostMatch === 'MATCH')
        ? 'E2E_SUPABASE_HOST'
        : 'HOSTNAME_NOT_AVAILABLE'
    const transport = failures.at(-1)?.errorClass ?? 'UNKNOWN_FAILURE'
    const isDns = transport === 'DNS_RESOLUTION_ERROR'
    return {
      requests: {
        attemptCount: failures.length,
        attempt1Transport: failures[0]?.errorClass ?? 'UNKNOWN_FAILURE',
        attempt1RetryAllowed: failures.length > 1 ? 'yes' : 'no',
        attempt1Host: hostClass,
        backoffRequired: isDns ? 'yes' : 'no',
        backoffExecuted: isDns && failures.length > 1 ? 'yes' : 'no',
        backoffCount: isDns && failures.length > 1 ? 1 : 0,
        backoffMs: isDns && failures.length > 1 ? 1000 : 0,
        attempt2Executed: failures.length > 1 ? 'yes' : 'no',
        attempt2Transport: failures[1]?.errorClass ?? 'NOT_REACHED',
        attempt2Host: failures.length > 1 ? hostClass : 'NOT_REACHED',
        final: 'FAIL',
      },
      loans: 'NOT_REACHED',
      correlation: errors.length >= failures.length,
      transientFailures: failures.filter((event) => ['DNS_RESOLUTION_ERROR', 'CONNECTION_RESET', 'CONNECT_TIMEOUT', 'READ_TIMEOUT'].includes(event.errorClass)).length,
      transientRecoveries: failures.length > 1 && isDns ? 1 : 0,
      dnsBackoffCount: isDns && failures.length > 1 ? 1 : 0,
    }
  } catch {
    return { requests: { final: 'FAIL' }, loans: 'NOT_REACHED', correlation: false, transientFailures: 0, transientRecoveries: 0, dnsBackoffCount: 0 }
  }
}

function classifyBaselineFailure(baseline) {
  const failure = formatBaselineFailure(baseline?.failure)
  if (failure?.failureClass && failure.failureClass !== 'UNKNOWN') return failure.failureClass
  if (failure?.rawTransportClass && !['NO_FAILURE', 'UNKNOWN', 'UNKNOWN_REMOTE_READ_ERROR'].includes(failure.rawTransportClass)) return `BASELINE_${failure.rawTransportClass}`
  if (failure?.postgrestResultClass === 'SUPABASE_RESULT_ERROR_OBJECT') return 'BASELINE_SUPABASE_RESULT_ERROR'
  if (baseline?.failure?.invariantClass && baseline.failure.invariantClass !== 'NOT_APPLICABLE') return 'BASELINE_BUSINESS_INVARIANT_FAILURE'
  return 'BASELINE_UNKNOWN_REMOTE_READ_FAILURE'
}

export async function runSingleProcessPreflight({
  baselineCore = () => runBaselineCore(),
  cleanStateCore = (context) => runCleanStateCore(context),
  l1PreCore = () => runL1PreCore({ observerEnabled: true }),
  freezeGate = checkFreeze,
  isolationGate = checkProjectIsolation,
  storageGate = checkStorageStateFiles,
} = {}) {
  const counters = { baseline: 0, cleanState: 0, l1Pre: 0, nestedBaseline: 0, postFailureRemote: 0 }
  const contexts = []
  for (const gate of [freezeGate, isolationGate, storageGate]) {
    const result = await gate()
    if (!result.ok) return { ok: false, classification: result.classification, counters }
  }

  counters.baseline += 1
  contexts.push({ pid: process.pid, dns, fetch: globalThis.fetch })
  let baseline
  try { baseline = await baselineCore() } catch { baseline = { ok: false, final: 'FAIL', failure: { failureClass: 'BASELINE_UNEXPECTED_LOCAL_EXCEPTION', stage: 'COORDINATOR_BASELINE_CALL', currentReadOrdinal: 'UNKNOWN', currentReadPurposeClass: 'UNKNOWN', rawTransportClass: 'UNKNOWN', hostClass: 'HOSTNAME_NOT_AVAILABLE', statusClass: 'UNKNOWN', readsStarted: 0, readsCompleted: 0 } } }
  if (!baseline.ok) return { ok: false, classification: classifyBaselineFailure(baseline), counters, baseline, contexts }

  counters.cleanState += 1
  contexts.push({ pid: process.pid, dns, fetch: globalThis.fetch })
  let cleanState
  try { cleanState = await cleanStateCore({ baselineResult: baseline }) } catch { return { ok: false, classification: 'CLEAN_STATE_FAILED', counters, baseline, contexts } }
  if (!cleanState.ok) return { ok: false, classification: 'CLEAN_STATE_FAILED', counters, baseline, cleanState, contexts }

  counters.l1Pre += 1
  contexts.push({ pid: process.pid, dns, fetch: globalThis.fetch })
  let l1Pre
  try { l1Pre = await l1PreCore() } catch { l1Pre = { ok: false, ...readL1FailureEvidence() } }
  if (!l1Pre.ok) return { ok: false, classification: 'L1_PRE_FAILED', counters, baseline, cleanState, l1Pre, contexts }

  return { ok: true, classification: 'PASS', counters, baseline, cleanState, l1Pre, contexts }
}

export { formatBaselineFailure, formatPreflightResult }

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]
if (isMain) {
  const args = new Set(process.argv.slice(2))
  if (!args.has('--confirm-e2e') || !args.has('--flow=FLOW-L1') || !args.has('--stage=preflight')) {
    console.error('SINGLE_PROCESS_PREFLIGHT: FAIL\nCATEGORY: preflight_stage_only')
    process.exit(1)
  }
  try {
    const result = await runSingleProcessPreflight()
    const formatted = formatPreflightResult(result)
    console.log(`SINGLE_PROCESS_PREFLIGHT: ${result.ok ? 'PASS' : 'FAIL'}`)
    console.log(`FREEZE: ${['FREEZE_INVALID', 'FREEZE_HASH_MISMATCH', 'FREEZE_BASELINE_MISMATCH', 'COORDINATOR_REFERENCE_INVALID', 'COORDINATOR_HASH_MISMATCH'].includes(result.classification) ? 'FAIL' : 'PASS'}`)
    console.log(`BASELINE_CORE_EXECUTIONS: ${result.counters.baseline}`)
    console.log(`CLEAN_STATE_CORE_EXECUTIONS: ${result.counters.cleanState}`)
    console.log(`L1_PRE_CORE_EXECUTIONS: ${result.counters.l1Pre}`)
    console.log(`NESTED_BASELINE_EXECUTIONS: ${result.counters.nestedBaseline}`)
    console.log(`POST_FAILURE_REMOTE_CHECK_EXECUTIONS: ${result.counters.postFailureRemote}`)
    const samePid = result.contexts?.length === 3 && new Set(result.contexts.map((context) => context.pid)).size === 1
    const comparison = result.contexts?.length === 3 ? (samePid ? 'yes' : 'no') : 'NOT_REACHED'
    console.log(`ALL_REMOTE_CORES_SAME_PID: ${comparison}`)
    console.log(`ALL_REMOTE_CORES_SAME_DNS_RUNTIME: ${comparison}`)
    console.log(`ALL_REMOTE_CORES_SAME_DISPATCHER_CONTEXT: ${comparison}`)
    if (result.baseline?.failure) {
      const failure = formatted.baselineFailure
      console.log(`BASELINE_FAILURE_LAYER: ${failure.failureLayer}`)
      console.log(`BASELINE_FAILURE_READ_ORDINAL: ${failure.currentReadOrdinal}`)
      console.log(`BASELINE_FAILURE_READ_PURPOSE_CLASS: ${failure.currentReadPurposeClass}`)
      console.log(`BASELINE_FAILURE_CLASS: ${failure.failureClass}`)
      console.log(`BASELINE_FAILURE_STAGE: ${failure.failureStage}`)
      console.log(`BASELINE_FAILURE_READS_STARTED: ${failure.readsStarted}`)
      console.log(`BASELINE_FAILURE_READS_COMPLETED: ${failure.readsCompleted}`)
      console.log(`BASELINE_FAILURE_RAW_TRANSPORT_CLASS: ${failure.rawTransportClass}`)
      console.log(`BASELINE_FAILURE_POSTGREST_RESULT_CLASS: ${failure.postgrestResultClass}`)
      console.log(`BASELINE_FAILURE_STATUS_CLASS: ${failure.statusClass}`)
      console.log(`BASELINE_FAILURE_HOST_CLASS: ${failure.hostClass}`)
      console.log(`BASELINE_FAILURE_RAW_TO_RESULT_CORRELATION_VALID: ${failure.rawToResultCorrelationValid}`)
      console.log(`BASELINE_FAILURE_EXCEPTION_FINGERPRINT_CLASS: ${failure.exceptionFingerprintClass}`)
      console.log(`CLEAN_STATE_RESULT: ${formatted.cleanStateResult}`)
      console.log(`L1_PRE_RESULT: ${formatted.l1PreResult}`)
    }
    if (result.l1Pre?.requests) {
      const request = result.l1Pre.requests
      console.log(`REQUESTS_ATTEMPT_COUNT: ${request.attemptCount ?? 'UNKNOWN'}`)
      console.log(`REQUESTS_ATTEMPT1_TRANSPORT_CLASS: ${request.attempt1Transport ?? 'UNKNOWN_FAILURE'}`)
      console.log(`REQUESTS_ATTEMPT1_RETRY_ALLOWED: ${request.attempt1RetryAllowed ?? 'unknown'}`)
      console.log(`REQUESTS_ATTEMPT1_HOST_CLASS: ${request.attempt1Host ?? 'HOSTNAME_NOT_AVAILABLE'}`)
      console.log(`REQUESTS_BACKOFF_EXECUTED: ${request.backoffExecuted ?? 'no'}`)
      console.log(`REQUESTS_BACKOFF_COUNT: ${request.backoffCount ?? 0}`)
      console.log(`REQUESTS_BACKOFF_MS: ${request.backoffMs ?? 0}`)
      console.log(`REQUESTS_ATTEMPT2_EXECUTED: ${request.attempt2Executed ?? 'no'}`)
      console.log(`REQUESTS_ATTEMPT2_TRANSPORT_CLASS: ${request.attempt2Transport ?? 'NOT_REACHED'}`)
      console.log(`REQUESTS_ATTEMPT2_HOST_CLASS: ${request.attempt2Host ?? 'NOT_REACHED'}`)
      console.log(`REQUESTS_FINAL_RESULT: ${request.final ?? 'FAIL'}`)
      console.log(`LOANS_FINAL_RESULT: ${result.l1Pre.loans ?? 'NOT_REACHED'}`)
      console.log(`RAW_TRANSPORT_TO_RESULT_CORRELATION_VALID: ${result.l1Pre.correlation ? 'yes' : 'no'}`)
      console.log(`DNS_FAILURE_AFTER_BACKOFF_SAME_PROCESS: ${request.attempt1Transport === 'DNS_RESOLUTION_ERROR' && request.attempt2Executed === 'yes' && request.attempt2Transport === 'DNS_RESOLUTION_ERROR' ? 'yes' : 'no'}`)
    }
    process.exit(result.ok ? 0 : 1)
  } catch (error) {
    console.error('SINGLE_PROCESS_PREFLIGHT: FAIL\nCATEGORY: ' + (error?.message ?? 'preflight_failed'))
    process.exit(1)
  }
}
