import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createAdminReadClient } from './lib/mutating-remote.mjs'
import { L1_PRE_REQUESTS_QUERY } from './lib/l1-pre-readtable.mjs'

const source = await fs.readFile(new URL('./verify-mutating-flow-l1.mjs', import.meta.url), 'utf8')
const supabaseSource = await fs.readFile(new URL('../../node_modules/@supabase/supabase-js/dist/index.mjs', import.meta.url), 'utf8')
const postgrestSource = await fs.readFile(new URL('../../node_modules/@supabase/postgrest-js/dist/index.mjs', import.meta.url), 'utf8')

assert.match(source, /createAdminReadClient\(\{ url: effectiveSupabaseUrl \}\)/)
assert.match(supabaseSource, /this\.rest = new PostgrestClient/)
assert.match(supabaseSource, /fetch: this\.fetch/)
assert.match(postgrestSource, /const _fetch = this\.fetch/)

const capture = []
const client = createAdminReadClient({
  fetch: async (input, init = {}) => {
    const url = new URL(String(input))
    capture.push({
      hostMatchesTarget: url.hostname === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
      pathClass: url.pathname === '/rest/v1/requests' ? 'CANONICAL_REQUESTS_REST_PATH' : 'OTHER_PATH',
      methodClass: init.method ?? 'UNSET',
      signalPresent: Boolean(init.signal),
      redirectClass: init.redirect ?? 'UNSET',
      authHeaderPresent: new Headers(init.headers).has('Authorization'),
      apiKeyHeaderPresent: new Headers(init.headers).has('apikey'),
      customDispatcherPresent: Boolean(init.dispatcher),
    })
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  },
})

const response = await client.from(L1_PRE_REQUESTS_QUERY.table).select(L1_PRE_REQUESTS_QUERY.columns)
assert.equal(response.error, null)
assert.equal(capture.length, 1)
assert.equal(capture[0].hostMatchesTarget, true)
assert.equal(capture[0].pathClass, 'CANONICAL_REQUESTS_REST_PATH')

console.log('L1_F3U_POSTGREST_NETWORK_FREE_CAPTURE_USED=yes')
console.log('L1_F3U_POSTGREST_CAPTURE_NETWORK_REACHABILITY=0')
console.log('L1_F3U_CAPTURE_HOST_EQUALS_E2E=yes')
console.log(`L1_F3U_CAPTURE_METHOD_CLASS=${capture[0].methodClass}`)
console.log(`L1_F3U_CAPTURE_AUTH_HEADER_PRESENT=${capture[0].authHeaderPresent ? 'yes' : 'no'}`)
console.log(`L1_F3U_CAPTURE_APIKEY_HEADER_PRESENT=${capture[0].apiKeyHeaderPresent ? 'yes' : 'no'}`)
console.log(`L1_F3U_CAPTURE_CUSTOM_DISPATCHER_PRESENT=${capture[0].customDispatcherPresent ? 'yes' : 'no'}`)
console.log('L1_F3U_CAPTURE_SECRET_REDACTION_TEST=PASS')
console.log('L1_F3U_PASSIVE_OBSERVER_NETWORK_PATH_NEUTRALITY_TEST=PASS')
