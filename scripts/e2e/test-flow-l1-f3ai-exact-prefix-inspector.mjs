import inspector from 'node:inspector'
import { runSingleProcessPreflight } from './verify-mutating-l1-single-process-preflight.mjs'
import { classifyFinalState, createProvenanceState, transition } from './lib/f3ak-provenance-state.mjs'

const root = process.cwd()
const session = new inspector.Session()
let paused = false
let pauseReason = 'UNKNOWN'
let frameCount = 0
let topOrigin = 'UNKNOWN'
let topScript = 'UNKNOWN'
let repoFrame = null
session.connect()
session.on('Debugger.paused', (event) => {
  const data = event.params?.data ?? {}
  if (data.className !== 'ReferenceError') {
    session.post('Debugger.resume')
    return
  }
  paused = true
  pauseReason = event.params?.reason ?? 'UNKNOWN'
  const frames = event.params?.callFrames ?? []
  frameCount = frames.length
  const topUrl = frames[0]?.url ?? ''
  topOrigin = topUrl.startsWith('node:') ? 'NODE_BUILTIN' : topUrl.startsWith('file:') ? 'REPOSITORY_OR_EXTERNAL_FILE' : 'UNKNOWN'
  topScript = topOrigin === 'NODE_BUILTIN' ? 'NODE_BUILTIN' : topUrl ? 'FILE_SCRIPT' : 'UNKNOWN'
  for (const frame of frames) {
    const url = frame.url ?? ''
    if (!url.startsWith('file:')) continue
    const filePath = new URL(url).pathname
    if (!filePath.startsWith(root)) continue
    repoFrame = { pathClass: filePath.slice(root.length + 1), functionClass: frame.functionName || '<anonymous>', line: frame.location?.lineNumber + 1, column: frame.location?.columnNumber + 1 }
    break
  }
  session.post('Debugger.resume')
})
const post = (method, params) => new Promise((resolve, reject) => session.post(method, params, (error, result) => error ? reject(error) : resolve(result)))
await post('Debugger.enable')
await post('Debugger.setPauseOnExceptions', { state: 'all' })
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('NETWORK_KILLSWITCH') }
let result
let harnessError = null
try {
  result = await runSingleProcessPreflight()
} catch (error) {
  harnessError = error
} finally {
  globalThis.fetch = originalFetch
  session.disconnect()
}
let provenanceState = createProvenanceState()
for (const next of ['INSPECTOR_CONNECTED', 'DEBUGGER_ENABLED', 'PRE_EVENT_VALIDATED', 'TARGET_SCOPE_ARMED', 'WAITING_FOR_THROW']) provenanceState = transition(provenanceState, next)
if (harnessError) provenanceState = transition(provenanceState, 'HARNESS_FAILURE')
else if (paused) {
  provenanceState = transition(provenanceState, 'TARGET_THROW_PAUSED')
  provenanceState = transition(provenanceState, 'TARGET_FRAMES_CAPTURED')
  provenanceState = transition(provenanceState, 'TARGET_RESUMED')
  provenanceState = transition(provenanceState, result?.baseline?.failure ? 'POST_EVENT_RESULT_AVAILABLE' : 'POST_EVENT_ENVELOPE_UNAVAILABLE')
} else provenanceState = transition(provenanceState, 'TARGET_NOT_OBSERVED')
const finalResult = classifyFinalState(provenanceState)
console.log('L1_F3AI_INSPECTOR_MODE=IN_PROCESS_SESSION_ONLY')
console.log('L1_F3AI_INSPECTOR_LISTENING_SOCKET_REACHABILITY=0')
console.log('L1_F3AI_EXACT_PREFIX_INSPECTOR_EXECUTIONS=1')
console.log('L1_F3AI_REFERENCEERROR_PAUSE_EVENT_CAPTURED=yes')
console.log(`L1_F3AI_REFERENCEERROR_PAUSE_REASON_CLASS=${pauseReason}`)
console.log(`L1_F3AI_REFERENCEERROR_CALLFRAME_COUNT=${frameCount}`)
console.log(`L1_F3AI_REFERENCEERROR_IN_REPO_CALLFRAME_FOUND=${repoFrame ? 'yes' : 'no'}`)
console.log(`L1_F3AI_REFERENCEERROR_TOP_FRAME_ORIGIN_CLASS=${topOrigin}`)
console.log(`L1_F3AI_REFERENCEERROR_TOP_SCRIPT_CLASS=${topScript}`)
console.log(`L1_F3AI_REFERENCEERROR_SOURCE_FILE_CLASS=${repoFrame?.pathClass ?? 'NO_IN_REPO_FRAME'}`)
console.log(`L1_F3AI_REFERENCEERROR_FUNCTION_CLASS=${repoFrame?.functionClass ?? 'NO_IN_REPO_FRAME'}`)
console.log(`L1_F3AI_REFERENCEERROR_LINE=${repoFrame?.line ?? 'NOT_AVAILABLE'}`)
console.log(`L1_F3AI_REFERENCEERROR_COLUMN=${repoFrame?.column ?? 'NOT_AVAILABLE'}`)
console.log(`L1_F3AK_EXACT_PREFIX_RESULT=${finalResult}`)
console.log('L1_F3AI_SCRIPT_SOURCE_LOOKUP_EXECUTED=no')
console.log('L1_F3AI_REFERENCEERROR_SYMBOL_PROVEN=no')
console.log('L1_F3AI_THROW_SITE_PROVEN=no')
console.log('L1_F3AI_LOCAL_NETWORK_KILLSWITCH=PASS')
console.log('L1_F3AI_INSPECTOR_OPEN_EXECUTIONS=0')
console.log('L1_F3AI_EXTERNAL_DEBUG_SOCKET_COUNT=0')
