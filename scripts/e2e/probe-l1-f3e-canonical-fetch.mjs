#!/usr/bin/env node
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { createDiagnosticFetchTap } from './lib/l1-fetch-tap.mjs'
import { L1_PRE_REQUESTS_QUERY, readTable } from './lib/l1-pre-readtable.mjs'

const fetchEvents = []
const client = createAdminReadClient({
  fetch: createDiagnosticFetchTap(globalThis.fetch, (event) => fetchEvents.push(event)),
})
const boundaryEvents = []
try {
  const result = await readTable(client, { ...L1_PRE_REQUESTS_QUERY, ordinal: 1 }, (event) => boundaryEvents.push(event))
  const fetchEvent = fetchEvents[0] ?? {}
  console.log('L1_F3E_FETCH_RESOLUTION: RESOLVED')
  console.log(`L1_F3E_FETCH_HTTP_STATUS_CLASS: ${fetchEvent.statusClass ?? 'UNKNOWN'}`)
  console.log(`L1_F3E_POSTGREST_DATA_CLASS: ${Array.isArray(result.value) ? 'ARRAY' : 'OTHER'}`)
  console.log('L1_F3E_POSTGREST_ERROR_PRESENT: no')
  console.log('L1_F3E_POSTGREST_STATUS_CLASS: HTTP_2XX')
  console.log('L1_F3E_CURRENT_ERROR_ORIGIN: NONE')
  process.exit(0)
} catch (error) {
  const fetchEvent = fetchEvents[0] ?? {}
  const boundary = boundaryEvents.find((event) => event.result === 'RESULT_BOUNDARY') ?? {}
  const diagnostic = error.diagnostic ?? {}
  console.log(`L1_F3E_FETCH_RESOLUTION: ${fetchEvent.resolution ?? 'UNKNOWN'}`)
  if (fetchEvent.resolution === 'RESOLVED') console.log(`L1_F3E_FETCH_HTTP_STATUS_CLASS: ${fetchEvent.statusClass ?? 'UNKNOWN'}`)
  else console.log(`L1_F3E_RAW_FETCH_ERROR_CLASS: ${fetchEvent.fingerprint?.constructorClass ?? 'UNKNOWN'}`)
  console.log(`L1_F3E_POSTGREST_DATA_CLASS: ${boundary.dataClass ?? 'UNKNOWN'}`)
  console.log('L1_F3E_POSTGREST_ERROR_PRESENT: yes')
  console.log(`L1_F3E_POSTGREST_STATUS_CLASS: ${boundary.errorStatusClass ?? 'NONE'}`)
  console.log(`L1_F3E_POSTGREST_ERROR_CODE_VALUE_CLASS: ${diagnostic.errorClass ?? 'UNKNOWN'}`)
  console.log('L1_F3E_POSTGREST_ERROR_MESSAGE_CLASS: REDACTED')
  console.log('L1_F3E_POSTGREST_ERROR_DETAILS_CLASS: REDACTED')
  console.log('L1_F3E_POSTGREST_ERROR_HINT_CLASS: REDACTED')
  console.log(`L1_F3E_CURRENT_ERROR_ORIGIN: ${fetchEvent.resolution === 'REJECTED' ? 'CLIENT_FETCH_FAILURE_NORMALIZED_BY_POSTGREST_JS' : 'HTTP_POSTGREST_ERROR_RESPONSE'}`)
  process.exitCode = 1
}
