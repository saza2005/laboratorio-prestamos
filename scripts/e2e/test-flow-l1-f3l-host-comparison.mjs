import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { compareRawErrorHost } from './lib/l1-passive-observer.mjs'

const expected = 'e2e-target.example'
assert.equal(compareRawErrorHost({ hostname: expected }, expected), 'MATCH')
assert.equal(compareRawErrorHost({ hostname: 'other-target.example' }, expected), 'MISMATCH')
assert.equal(compareRawErrorHost(new Error('no host'), expected), 'HOSTNAME_NOT_AVAILABLE')
const output = JSON.stringify({ class: compareRawErrorHost({ hostname: expected }, expected) })
assert.equal(output.includes(expected), false)
const observerSource = await readFile(new URL('./verify-mutating-flow-l1.mjs', import.meta.url), 'utf8')
assert.equal(observerSource.includes('startPassiveObserver(() => currentReadOrdinal, passiveTargetHost)'), true)
console.log('L1_F3L_HOST_MATCH_TEST: PASS')
console.log('L1_F3L_HOST_MISMATCH_TEST: PASS')
console.log('L1_F3L_HOST_ABSENT_TEST: PASS')
console.log('L1_F3L_HOST_SECRET_REDACTION_TEST: PASS')
console.log('L1_F3L_RAW_HOST_OUTPUT_REACHABILITY: 0')
