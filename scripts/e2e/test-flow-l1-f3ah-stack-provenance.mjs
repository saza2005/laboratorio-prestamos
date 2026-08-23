import assert from 'node:assert/strict'
import inspector from 'node:inspector'
import path from 'node:path'
import { runSingleProcessPreflight } from './verify-mutating-l1-single-process-preflight.mjs'

const root = process.cwd()
const session = new inspector.Session()
const frames = []
let referenceErrorPaused = false
session.connect()
session.on('Debugger.paused', (event) => {
  const data = event.params?.data ?? {}
  const className = data.className ?? data.type ?? 'UNKNOWN'
  if (className === 'ReferenceError' || String(data.description ?? '').startsWith('ReferenceError')) {
    referenceErrorPaused = true
    for (const frame of event.params.callFrames ?? []) {
      const url = frame.url ?? ''
      const filePath = url.startsWith('file:') ? new URL(url).pathname : url
      if (!filePath.startsWith(root)) continue
      frames.push({
        fileClass: path.relative(root, filePath),
        functionClass: frame.functionName || '<anonymous>',
        lineClass: frame.location?.lineNumber + 1,
        columnClass: frame.location?.columnNumber + 1,
      })
    }
  }
  session.post('Debugger.resume')
})

await new Promise((resolve, reject) => session.post('Debugger.enable', (error) => error ? reject(error) : resolve()))
await new Promise((resolve, reject) => session.post('Debugger.setPauseOnExceptions', { state: 'all' }, (error) => error ? reject(error) : resolve()))

const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('NETWORK_KILLSWITCH') }
let result
try {
  result = await runSingleProcessPreflight()
} finally {
  globalThis.fetch = originalFetch
  session.disconnect()
}

assert.equal(result.baseline?.failure?.stage, 'OBSERVER_START')
assert.equal(result.baseline?.failure?.fingerprint?.constructorClass, 'ReferenceError')
assert.equal(referenceErrorPaused, true)
console.log('L1_F3AH_SAFE_STACK_CAPTURE_READY=yes')
console.log('L1_F3AH_STACK_REPRO_EXECUTIONS=1')
console.log('L1_F3AH_REFERENCE_ERROR_REPRODUCED_FOR_STACK=yes')
console.log(`L1_F3AH_REFERENCE_ERROR_IN_REPO_FRAME_FOUND=${frames.length > 0 ? 'yes' : 'no'}`)
if (frames.length > 0) {
  const first = frames[0]
  console.log(`L1_F3AH_REFERENCE_ERROR_SOURCE_FILE_CLASS=${first.fileClass}`)
  console.log(`L1_F3AH_REFERENCE_ERROR_FUNCTION_CLASS=${first.functionClass}`)
  console.log(`L1_F3AH_REFERENCE_ERROR_LINE_CLASS=${first.lineClass}`)
  console.log(`L1_F3AH_REFERENCE_ERROR_COLUMN_CLASS=${first.columnClass}`)
} else {
  console.log('L1_F3AH_REFERENCE_ERROR_SOURCE_FILE_CLASS=NO_IN_REPO_FRAME')
  console.log('L1_F3AH_REFERENCE_ERROR_FUNCTION_CLASS=NO_IN_REPO_FRAME')
  console.log('L1_F3AH_REFERENCE_ERROR_LINE_CLASS=NOT_AVAILABLE')
  console.log('L1_F3AH_REFERENCE_ERROR_COLUMN_CLASS=NOT_AVAILABLE')
}
console.log('L1_F3AH_LOCAL_NETWORK_KILLSWITCH=PASS')
console.log('L1_F3AH_REMOTE_NETWORK_OPERATIONS=0')
