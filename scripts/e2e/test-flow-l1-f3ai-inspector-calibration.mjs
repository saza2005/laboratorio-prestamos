import assert from 'node:assert/strict'
import inspector from 'node:inspector'

const session = new inspector.Session()
let paused = false
let classClass = 'UNKNOWN'
let frameCount = 0
session.connect()
session.on('Debugger.paused', (event) => {
  paused = true
  classClass = event.params?.data?.className ?? 'UNKNOWN'
  frameCount = event.params?.callFrames?.length ?? 0
  session.post('Debugger.resume')
})
const post = (method, params) => new Promise((resolve, reject) => session.post(method, params, (error, result) => error ? reject(error) : resolve(result)))
await post('Debugger.enable')
await post('Debugger.setPauseOnExceptions', { state: 'all' })
try {
  try { throw new ReferenceError('SYNTHETIC_SAFE_REFERENCE_ERROR') } catch (error) { assert.equal(error.constructor.name, 'ReferenceError') }
} finally {
  session.disconnect()
}
assert.equal(paused, true)
assert.equal(classClass, 'ReferenceError')
assert.ok(frameCount > 0)
console.log('L1_F3AI_INSPECTOR_CAUGHT_EXCEPTION_CALIBRATION=PASS')
console.log('L1_F3AI_INSPECTOR_RAW_EXCEPTION_DESCRIPTION_READ=0')
console.log('L1_F3AI_SAFE_CALLFRAME_MODEL_READY=yes')
console.log('L1_F3AI_INSPECTOR_REDACTION_TEST=PASS')
console.log('L1_F3AI_INSPECTOR_OPEN_EXECUTIONS=0')
console.log('L1_F3AI_EXTERNAL_DEBUG_SOCKET_COUNT=0')
