#!/usr/bin/env node
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { L1_PRE_LOANS_QUERY, L1_PRE_REQUESTS_QUERY, readTable } from './lib/l1-pre-readtable.mjs'

const readName = process.argv.find((arg) => arg.startsWith('--read='))?.slice(7)
const reads = {
  requests: L1_PRE_REQUESTS_QUERY,
  loans: L1_PRE_LOANS_QUERY,
}
const target = reads[readName]
if (!target) {
  console.error('L1_PRE_READ_PROBE: FAIL\nCATEGORY: invalid_read')
  process.exit(1)
}

const admin = createAdminReadClient()
const events = []
try {
  const result = await readTable(admin, { ...target, ordinal: readName === 'requests' ? 1 : 2 }, (event) => events.push(event))
  console.log(`L1_PRE_${readName.toUpperCase()}_REMOTE_PROBE: PASS`)
  console.log(`L1_PRE_${readName.toUpperCase()}_PROBE_ATTEMPTS: ${result.attempts}`)
  console.log('L1_PRE_PROBE_FAILURE_CLASS: NONE')
  console.log('L1_PRE_PROBE_SAFE_ERROR_FINGERPRINT_CLASS: NONE')
  console.log(`L1_PRE_${readName.toUpperCase()}_ROW_CLASS: ${Array.isArray(result.value) ? 'ARRAY' : 'UNEXPECTED'}`)
} catch (error) {
  const diagnostic = error.diagnostic ?? { errorClass: 'UNKNOWN_REMOTE_READ_ERROR' }
  console.log(`L1_PRE_${readName.toUpperCase()}_REMOTE_PROBE: FAIL`)
  console.log(`L1_PRE_${readName.toUpperCase()}_PROBE_ATTEMPTS: ${diagnostic.attempt ?? 'UNKNOWN'}`)
  console.log(`L1_PRE_${readName.toUpperCase()}_PROBE_FAILURE_CLASS: ${diagnostic.errorClass ?? 'UNKNOWN_REMOTE_READ_ERROR'}`)
  console.log(`L1_PRE_${readName.toUpperCase()}_PROBE_SAFE_ERROR_FINGERPRINT_CLASS: ${diagnostic.fingerprint?.constructorClass ?? 'UNKNOWN'}`)
  process.exitCode = 1
}

if (process.env.L1_PRINT_LOCAL_PROBE_EVENT_COUNT === 'yes') console.log(`L1_PRE_PROBE_EVENT_COUNT: ${events.length}`)
