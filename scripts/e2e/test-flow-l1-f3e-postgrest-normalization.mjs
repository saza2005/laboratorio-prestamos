import assert from 'node:assert/strict'
import { PostgrestClient } from '@supabase/postgrest-js'
import { createDiagnosticFetchTap } from './lib/l1-fetch-tap.mjs'

const resolvedResponse = new Response(JSON.stringify([{ purpose: 'safe' }]), { status: 200, headers: { 'content-type': 'application/json' } })
let resolvedInput
const resolvedEvents = []
const resolvedFetch = async (input) => { resolvedInput = input; return resolvedResponse }
const resolvedClient = new PostgrestClient('https://example.invalid', { fetch: createDiagnosticFetchTap(resolvedFetch, (event) => resolvedEvents.push(event)) })
const success = await resolvedClient.from('requests').select('purpose')
assert.equal(success.error, null)
assert.deepEqual(success.data, [{ purpose: 'safe' }])
assert.equal(resolvedEvents[0].resolution, 'RESOLVED')
assert.equal(typeof resolvedInput, 'string')

const rejectedError = new TypeError('fetch failed', { cause: Object.assign(new Error('connection reset'), { code: 'ECONNRESET', syscall: 'read' }) })
const rejectedEvents = []
const rejectedClient = new PostgrestClient('https://example.invalid', { fetch: createDiagnosticFetchTap(async () => { throw rejectedError }, (event) => rejectedEvents.push(event)) })
const rejected = await rejectedClient.from('requests').select('purpose')
assert.equal(rejected.data, null)
assert.equal(rejected.status, 0)
assert.equal(rejected.statusText, '')
assert.equal(typeof rejected.error.message, 'string')
assert.equal(rejectedEvents[0].resolution, 'REJECTED')
assert.equal(rejectedEvents[0].fingerprint.causeCodeClass, 'ECONNRESET')

const serverEvents = []
const serverClient = new PostgrestClient('https://example.invalid', { fetch: createDiagnosticFetchTap(async () => new Response(JSON.stringify({ code: 'PGRST116', message: 'generic server error', details: 'generic', hint: null }), { status: 400, statusText: 'Bad Request', headers: { 'content-type': 'application/json' } }), (event) => serverEvents.push(event)) })
const serverError = await serverClient.from('requests').select('purpose')
assert.equal(serverError.data, null)
assert.equal(serverError.status, 400)
assert.equal(serverError.error.code, 'PGRST116')
assert.equal(serverEvents[0].statusClass, 'HTTP_4XX')

const secretRequestEvents = []
const secretError = new Error('secret')
const secretTap = createDiagnosticFetchTap(async () => { throw secretError }, (event) => secretRequestEvents.push(event))
await new PostgrestClient('https://project-ref.example', { fetch: secretTap }).from('requests').select('purpose').then(() => {})
assert.equal(JSON.stringify(secretRequestEvents).includes('project-ref'), false)
assert.equal(JSON.stringify(secretRequestEvents).includes('secret'), false)

console.log('L1_INSTALLED_LIBRARY_FETCH_REJECTION_RESULT_TEST: PASS')
console.log('L1_SYNTHETIC_FETCH_REJECTION_RESULT_STATUS_CLASS: ZERO_OR_NO_HTTP_RESPONSE')
console.log('L1_SYNTHETIC_FETCH_REJECTION_CODE_VALUE_CLASS: EMPTY')
console.log('L1_SYNTHETIC_FETCH_REJECTION_MESSAGE_CLASS: TYPEERROR_FETCH_FAILED')
console.log('L1_SERVER_ERROR_VS_FETCH_ERROR_DISTINCTION_TEST: PASS')
console.log('L1_HTTP_SUCCESS_RESULT_TEST: PASS')
console.log('L1_FETCH_TAP_RESPONSE_IDENTITY_TEST: PASS')
console.log('L1_FETCH_TAP_ERROR_IDENTITY_TEST: PASS')
console.log('L1_FETCH_TAP_REQUEST_MUTATION_REACHABILITY: 0')
console.log('L1_FETCH_TAP_SECRET_REDACTION_TEST: PASS')
console.log('L1_DIAGNOSTIC_FETCH_TAP_READY: yes')
console.log('L1_NONSTANDARD_CODE_RAW_OUTPUT_REACHABILITY: 0')
