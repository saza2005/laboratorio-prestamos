import assert from 'node:assert/strict'
import { classifyReadError, describeSupabaseResult, isTransientReadError, readWithBoundedRetry, safeErrorFingerprint } from './lib/clean-state-diagnostics.mjs'

class ErrorWithCode extends Error {
  constructor(code) { super(code); this.code = code }
}

const cases = [
  [new ErrorWithCode('ENOTFOUND'), 'DNS_RESOLUTION_ERROR'],
  [new ErrorWithCode('ECONNRESET'), 'CONNECTION_RESET'],
  [new ErrorWithCode('ETIMEDOUT'), 'CONNECT_TIMEOUT'],
  [{ status: 500 }, 'HTTP_5XX'],
  [{ status: 401 }, 'AUTH_ERROR'],
  [{ code: 'PGRST116', message: 'postgrest error' }, 'POSTGREST_ERROR'],
  [{ message: 'column does not exist' }, 'QUERY_ERROR'],
  [{ message: 'invalid json' }, 'RESULT_PARSE_ERROR'],
  [{ message: 'unclassified failure' }, 'UNKNOWN_REMOTE_READ_ERROR'],
]
for (const [error, expected] of cases) assert.equal(classifyReadError(error).errorClass, expected)
assert.deepEqual([...cases.slice(0, 3).map(([error]) => isTransientReadError(classifyReadError(error).errorClass))], [true, true, true])
assert.equal(isTransientReadError('HTTP_5XX'), false)
assert.equal(classifyReadError(new Error('wrapped', { cause: new ErrorWithCode('ENOTFOUND') })).errorClass, 'DNS_RESOLUTION_ERROR')
assert.equal(classifyReadError(new Error('wrapped', { cause: new ErrorWithCode('ECONNRESET') })).errorClass, 'CONNECTION_RESET')
assert.equal(classifyReadError(new Error('wrapped', { cause: new ErrorWithCode('ETIMEDOUT') })).errorClass, 'CONNECT_TIMEOUT')
assert.equal(classifyReadError(new AggregateError([new ErrorWithCode('ECONNRESET')], 'aggregate')).errorClass, 'CONNECTION_RESET')
const fingerprint = safeErrorFingerprint(new Error('https://secret.supabase.co', { cause: Object.assign(new Error('token=secret'), { code: 'ECONNRESET', errno: -104, syscall: 'read' }) }))
assert.equal(JSON.stringify(fingerprint).includes('supabase.co'), false)
assert.equal(JSON.stringify(fingerprint).includes('token='), false)
assert.equal(fingerprint.causeCodeClass, 'ECONNRESET')
assert.equal(describeSupabaseResult({ data: [{ id: 1 }], error: null }).errorClass, 'NULL')
assert.equal(describeSupabaseResult({ data: null, error: {} }).errorClass, 'EMPTY_SUPABASE_ERROR_OBJECT')
assert.equal(describeSupabaseResult({ data: [{ id: 1 }], error: {} }).errorClass, 'EMPTY_SUPABASE_ERROR_OBJECT')
assert.equal(describeSupabaseResult({ data: null, error: { code: 'PGRST', message: 'hidden' } }).errorClass, 'SUPABASE_RESULT_ERROR_OBJECT')
assert.equal(classifyReadError(Object.assign(new Error(), { l1DiagnosticClass: 'EMPTY_SUPABASE_ERROR_OBJECT' })).errorClass, 'EMPTY_SUPABASE_ERROR_OBJECT')

let attempts = 0
let events = []
const recovered = await readWithBoundedRetry(async () => {
  attempts += 1
  if (attempts === 1) throw new ErrorWithCode('ECONNRESET')
  return 'ok'
}, { ordinal: 1, readClass: 'TEST_READ' }, (event) => events.push(event))
assert.equal(recovered.value, 'ok')
assert.equal(recovered.attempts, 2)
assert.equal(recovered.recovered, true)
assert.equal(events.length, 2)

attempts = 0
await assert.rejects(() => readWithBoundedRetry(async () => {
  attempts += 1
  throw new ErrorWithCode('ECONNRESET')
}, { ordinal: 1, readClass: 'TEST_READ' }))
assert.equal(attempts, 2)

attempts = 0
await assert.rejects(() => readWithBoundedRetry(async () => {
  attempts += 1
  throw { code: 'PGRST116', message: 'query error' }
}, { ordinal: 1, readClass: 'TEST_READ' }))
assert.equal(attempts, 1)

attempts = 0
const success = await readWithBoundedRetry(async () => { attempts += 1; return 'ok' }, { ordinal: 1, readClass: 'TEST_READ' })
assert.equal(success.attempts, 1)
assert.equal(attempts, 1)

console.log('DNS_CLASSIFICATION_TEST: PASS')
console.log('CONNECTION_RESET_CLASSIFICATION_TEST: PASS')
console.log('TIMEOUT_CLASSIFICATION_TEST: PASS')
console.log('HTTP_5XX_CLASSIFICATION_TEST: PASS')
console.log('AUTH_ERROR_CLASSIFICATION_TEST: PASS')
console.log('QUERY_ERROR_CLASSIFICATION_TEST: PASS')
console.log('UNKNOWN_ERROR_FAIL_CLOSED_TEST: PASS')
console.log('CAUSED_DNS_CLASSIFICATION_TEST: PASS')
console.log('CAUSED_RESET_CLASSIFICATION_TEST: PASS')
console.log('CAUSED_CONNECT_TIMEOUT_CLASSIFICATION_TEST: PASS')
console.log('AGGREGATE_ERROR_CLASSIFICATION_TEST: PASS')
console.log('SAFE_ERROR_FINGERPRINT_SECRET_REDACTION_TEST: PASS')
console.log('EMPTY_SUPABASE_ERROR_OBJECT_TEST: PASS')
console.log('DATA_WITH_EMPTY_ERROR_FAIL_CLOSED_TEST: PASS')
console.log('SUPABASE_RESULT_ERROR_OBJECT_FAIL_CLOSED_TEST: PASS')
console.log('NORMAL_RESULT_BOUNDARY_TEST: PASS')
console.log('TRANSIENT_THEN_SUCCESS_TEST: PASS')
console.log('TRANSIENT_TWICE_FAIL_TEST: PASS')
console.log('NONTRANSIENT_NO_RETRY_TEST: PASS')
console.log('ALL_READS_SUCCESS_TEST: PASS')
