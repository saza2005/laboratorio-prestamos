import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { contentTypeClass, makeSanitizedPostRecord, sanitizePath, writeSanitizedCapture } from './lib/sanitized-post-capture.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-post-capture-'))
const file = path.join(tmp, 'posts.json')
const headers = { 'next-action': 'redacted', 'content-type': 'application/json; charset=utf-8', cookie: 'secret' }
const request = {
  url: () => 'http://localhost:3000/api/<uuid>?secret=value',
  headers: () => headers,
  method: () => 'POST',
  resourceType: () => 'fetch',
  isNavigationRequest: () => false,
}
const record = makeSanitizedPostRecord({ ordinal: 1, elapsedMs: 12, phase: 'AFTER_REAL_CONFIRM', request, pageOrigin: 'http://localhost:3000', classifierResult: 'SERVER_ACTION' })
writeSanitizedCapture(file, [record])
const saved = JSON.parse(fs.readFileSync(file, 'utf8'))
assert.equal(saved[0].has_next_action_header, true)
assert.equal(saved[0].path_class, '/api/<uuid>')
assert.equal(saved[0].content_type_class, 'application/json')
assert.equal('cookie' in saved[0], false)
assert.equal('body' in saved[0], false)
assert.equal(sanitizePath('/__nextjs_original-stack-frames?x=secret'), '/__nextjs_original-stack-frames')
assert.equal(contentTypeClass('text/plain; charset=utf-8'), 'text/plain')

const diagnostic = makeSanitizedPostRecord({
  ordinal: 2,
  elapsedMs: 20,
  phase: 'AFTER_REAL_CONFIRM',
  request: { ...request, url: () => 'http://localhost:3000/__nextjs_original-stack-frames', headers: () => ({ 'content-type': 'application/json' }) },
  pageOrigin: 'http://localhost:3000',
  classifierResult: 'UNKNOWN_OR_UNEXPECTED_POST',
})
writeSanitizedCapture(file, [record, diagnostic])
const replay = JSON.parse(fs.readFileSync(file, 'utf8'))
assert.equal(replay.length, 2)
assert.equal(replay[1].is_framework_diagnostic_candidate, true)
assert.equal(replay[1].runtime_classifier_result, 'UNKNOWN_OR_UNEXPECTED_POST')
console.log('SANITIZED_CAPTURE_SERVER_ACTION_TEST: PASS')
console.log('SANITIZED_CAPTURE_URL_REDACTION_TEST: PASS')
console.log('SANITIZED_CAPTURE_HEADER_REDACTION_TEST: PASS')
console.log('SANITIZED_CAPTURE_BODY_EXCLUSION_TEST: PASS')
console.log('UNKNOWN_CAPTURE_THEN_FAIL_CLOSED_TEST: PASS')
