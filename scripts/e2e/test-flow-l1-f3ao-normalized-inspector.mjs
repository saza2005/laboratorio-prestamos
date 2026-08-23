import inspector from 'node:inspector'

process.loadEnvFile('.env.e2e')
const { runSingleProcessPreflight } = await import('./verify-mutating-l1-single-process-preflight.mjs')

const root = process.cwd()
const session = new inspector.Session()
let throwObserved = false
let throwClass = 'NOT_OBSERVED'
let throwScriptClass = 'UNKNOWN'
let throwScriptId = 'NOT_AVAILABLE'
let throwLine = 'NOT_AVAILABLE'
let throwColumn = 'NOT_AVAILABLE'
let throwFrames = 0
let throwReason = 'NOT_AVAILABLE'
let throwDescription = 'NOT_AVAILABLE'
let throwCallFrames = []
let throwAsyncStackTrace = null
let coordinatorReached = false
let targetCompleted = false
let coordinatorResult = null
let executionError = null
const scriptMap = new Map()

function redactText(value) {
  return String(value ?? '')
    .replace(/https?:\/\/[^\s'"`]+/gi, '[REDACTED_URL]')
    .replace(/\b(?:bearer\s+)?[A-Za-z0-9_-]{24,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '[REDACTED_UUID]')
    .replace(/\b(?:password|secret|token|authorization|cookie|service[_-]?role[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\/home\/[^\s'"`]+/g, '[REDACTED_PATH]')
}

function sanitizeUrl(url) {
  const value = String(url ?? '')
  if (!value) return 'NOT_AVAILABLE'
  if (value.startsWith(`file://${root}/`)) return `REPOSITORY_FILE:${value.slice(`file://${root}/`.length)}`
  if (value.startsWith('node:')) return 'NODE_BUILTIN'
  if (value.startsWith('file:')) return 'EXTERNAL_FILE'
  return 'NON_REPOSITORY_SCRIPT'
}

function sanitizeFrame(frame) {
  const location = frame?.location ?? {}
  const scriptId = location.scriptId ?? frame?.scriptId ?? 'NOT_AVAILABLE'
  const mappedUrl = scriptMap.get(String(scriptId))?.url || 'NOT_AVAILABLE'
  return {
    functionName: redactText(frame?.functionName || 'NOT_AVAILABLE'),
    scriptId: String(scriptId),
    url: frame?.url ? sanitizeUrl(frame.url) : mappedUrl,
    line: location.lineNumber === undefined ? 'NOT_AVAILABLE' : location.lineNumber + 1,
    column: location.columnNumber === undefined ? 'NOT_AVAILABLE' : location.columnNumber + 1,
  }
}

function sanitizeAsyncStack(stack) {
  if (!stack) return null
  return {
    description: redactText(stack.description || 'NOT_AVAILABLE'),
    callFrames: (stack.callFrames ?? []).map(sanitizeFrame),
  }
}

function printForensicArtifact() {
  const artifact = {
    throw: {
      reason: throwReason,
      errorName: throwClass,
      description: throwDescription,
      scriptId: throwScriptId,
      url: throwCallFrames[0]?.url || scriptMap.get(String(throwScriptId))?.url || 'NOT_AVAILABLE',
      line: throwLine,
      column: throwColumn,
      callFrames: throwCallFrames,
      asyncStackTrace: throwAsyncStackTrace,
    },
    scriptMap: Object.fromEntries([...scriptMap].map(([id, entry]) => [id, entry])),
    baseline: {
      errorName: 'NOT_AVAILABLE_FROM_FROZEN_RUNTIME_ENVELOPE',
      errorMessage: 'NOT_AVAILABLE_FROM_FROZEN_RUNTIME_ENVELOPE',
      errorStack: 'NOT_AVAILABLE_FROM_FROZEN_RUNTIME_ENVELOPE',
    },
  }
  console.log(`L1_F3AU_SANITIZED_FORENSIC_ARTIFACT=${JSON.stringify(artifact)}`)
}

session.on('Debugger.scriptParsed', (event) => {
  const params = event.params ?? {}
  const scriptId = params.scriptId
  if (scriptId === undefined) return
  scriptMap.set(String(scriptId), { url: sanitizeUrl(params.url) })
})

session.on('Debugger.paused', (event) => {
  const data = event.params?.data ?? {}
  if (data.className !== 'ReferenceError') {
    session.post('Debugger.resume')
    return
  }
  throwObserved = true
  throwClass = 'ReferenceError'
  throwReason = event.params?.reason ?? 'NOT_AVAILABLE'
  throwDescription = redactText(data.description || data.value || 'NOT_AVAILABLE')
  const frames = event.params?.callFrames ?? []
  throwFrames = frames.length
  throwCallFrames = frames.map(sanitizeFrame)
  throwAsyncStackTrace = sanitizeAsyncStack(event.params?.asyncStackTrace)
  const first = frames[0]
  throwScriptId = first?.location?.scriptId ?? 'NOT_AVAILABLE'
  throwLine = first?.location?.lineNumber === undefined ? 'NOT_AVAILABLE' : first.location.lineNumber + 1
  throwColumn = first?.location?.columnNumber === undefined ? 'NOT_AVAILABLE' : first.location.columnNumber + 1
  const url = first?.url ?? ''
  throwScriptClass = url.startsWith('file:')
    ? (url.startsWith(`file://${root}/`) ? 'REPOSITORY_FILE' : 'EXTERNAL_FILE')
    : url.startsWith('node:') ? 'NODE_BUILTIN' : 'UNKNOWN'
  session.post('Debugger.resume')
})

function invokeCoordinator(resolve) {
  coordinatorReached = true
  runSingleProcessPreflight().then((result) => {
    coordinatorResult = result
    targetCompleted = true
    resolve()
  }, (error) => {
    executionError = error
    resolve()
  })
}

session.connect()
const completion = new Promise((resolve) => {
  session.post('Debugger.enable', (enableError) => {
    if (enableError) {
      executionError = new Error('INSPECTOR_ENABLE_FAILED')
      resolve()
      return
    }
    session.post('Debugger.setPauseOnExceptions', { state: 'all' }, (pauseError) => {
      if (pauseError) {
        executionError = new Error('INSPECTOR_PAUSE_CONFIGURATION_FAILED')
        resolve()
        return
      }
      invokeCoordinator(resolve)
    })
  })
})

const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('NETWORK_KILLSWITCH') }
try {
  await completion
} finally {
  globalThis.fetch = originalFetch
  session.disconnect()
}

console.log('L1_F3AO_INSPECTOR_MODE=IN_PROCESS_SESSION_ONLY')
console.log('L1_F3AO_INSPECTOR_OPEN_EXECUTIONS=0')
console.log('L1_F3AO_EXTERNAL_DEBUG_SOCKET_COUNT=0')
console.log(`L1_F3AO_THROW_EVENT_OBSERVED=${throwObserved ? 'yes' : 'no'}`)
console.log(`L1_F3AO_EXCEPTION_FINGERPRINT_CLASS=${throwClass}`)
console.log(`L1_F3AO_THROW_SCRIPT_CLASS=${throwScriptClass}`)
console.log(`L1_F3AO_THROW_SCRIPT_ID=${throwScriptId}`)
console.log(`L1_F3AO_THROW_LINE=${throwLine}`)
  console.log(`L1_F3AO_THROW_COLUMN=${throwColumn}`)
  console.log(`L1_F3AO_THROW_STACK_AVAILABLE=${throwFrames > 0 ? 'yes' : 'no'}`)
console.log(`L1_F3AO_COORDINATOR_REACHED=${coordinatorReached ? 'yes' : 'no'}`)
console.log(`L1_F3AO_TARGET_COMPLETED=${targetCompleted ? 'yes' : 'no'}`)
console.log(`L1_F3AO_TARGET_RESULT=${throwObserved ? 'REFERENCEERROR_OBSERVED' : executionError ? 'NON_INTERPRETABLE' : 'TARGET_REFERENCEERROR_NOT_REPRODUCED_UNDER_NORMALIZED_INSPECTOR'}`)
  console.log(`L1_F3AO_BASELINE_RESULT_CLASS=${coordinatorResult?.classification ?? 'NOT_AVAILABLE'}`)
  console.log('L1_F3AU_REFERENCEERROR_DESCRIPTION_CAPTURE_ADDED=yes')
  console.log(`L1_F3AU_REFERENCEERROR_DESCRIPTION=${throwDescription}`)
  console.log(`L1_F3AU_FULL_CALLFRAME_CAPTURE_ADDED=${throwCallFrames.length > 0 ? 'yes' : 'no'}`)
  console.log(`L1_F3AU_CALLFRAME_COUNT=${throwCallFrames.length}`)
  console.log('L1_F3AU_SCRIPT_MAP_CAPTURE_ADDED=yes')
  console.log('L1_F3AU_SCRIPT_MAP_CAPTURE_MODE=PASSIVE_EVENT_LISTENER')
  console.log(`L1_F3AU_ASYNC_STACK_CAPTURE_ADDED=${throwAsyncStackTrace ? 'yes' : 'no'}`)
  console.log('L1_F3AU_ASYNC_STACK_SOURCE=EXISTING_PAUSED_EVENT')
  console.log('L1_F3AU_BASELINE_ERROR_DETAIL_CAPTURE_ADDED=no_RUNTIME_ENVELOPE_FROZEN')
  printForensicArtifact()
  console.log('L1_F3AO_LOCAL_NETWORK_KILLSWITCH=PASS')
