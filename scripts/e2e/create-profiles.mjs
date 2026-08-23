#!/usr/bin/env node
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const users = [
  { alias: 'e2e_admin', role: 'admin', name: 'E2E Admin', emailKey: 'E2E_ADMIN_EMAIL' },
  { alias: 'e2e_lab_staff', role: 'lab_staff', name: 'E2E Laboratory Staff', emailKey: 'E2E_LAB_STAFF_EMAIL' },
  { alias: 'e2e_teacher', role: 'teacher', name: 'E2E Teacher', emailKey: 'E2E_TEACHER_EMAIL' },
  { alias: 'e2e_student', role: 'student', name: 'E2E Student', emailKey: 'E2E_STUDENT_EMAIL' },
]
const allowed = new Set(['--dry-run', '--execute', '--confirm-e2e'])
const args = new Set(process.argv.slice(2))
for (const arg of args) if (!allowed.has(arg)) fail('unknown_argument')
if (!args.has('--confirm-e2e')) fail('missing_confirm_e2e')
if (args.has('--dry-run') === args.has('--execute')) fail('choose_one_mode')

const env = loadEnv()
const state = loadState()
validateConfig(env, state)
const client = createClient(env.url, env.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const authUsers = await verifyAuthUsers(client, env, state)
const profiles = await readProfiles(client, authUsers.map((user) => user.id))
const results = users.map((definition) => {
  const authUser = authUsers.find((user) => user.alias === definition.alias)
  const existing = profiles.find((profile) => profile.id === authUser.id)
  if (!existing) return { definition, authUser, existing: null, status: 'WOULD_CREATE' }
  const matches = existing.id === authUser.id &&
    existing.email?.toLowerCase() === authUser.email &&
    existing.full_name === definition.name &&
    existing.role === definition.role
  return { definition, authUser, existing, status: matches ? 'ALREADY_EXISTS_MATCHING' : 'CONFLICT_EXISTING_PROFILE' }
})
console.log('profiles_before: ' + profiles.length)
for (const result of results) console.log(result.definition.alias + ': ' + result.status + ' (' + maskEmail(result.authUser.email) + ')')
if (results.some((result) => result.status === 'CONFLICT_EXISTING_PROFILE')) fail('conflicting_existing_profile')
if (args.has('--dry-run')) {
  console.log('mode: dry-run; writes: 0; profiles_state: not_created')
  process.exit(0)
}
if (process.env.E2E_PROFILE_CREATION_CONFIRM !== 'CREATE_E2E_PROFILES') fail('missing_profile_creation_confirmation')
const stateProfiles = {}
for (const result of results) {
  if (result.status === 'ALREADY_EXISTS_MATCHING') {
    stateProfiles[result.definition.alias] = { id: result.authUser.id, role: result.definition.role }
    continue
  }
  const payload = { id: result.authUser.id, full_name: result.definition.name, email: result.authUser.email, role: result.definition.role }
  const { data, error } = await client.from('profiles').insert(payload).select('id, role').single()
  if (error || !data?.id) fail('profile_insert_failed_' + result.definition.alias)
  stateProfiles[result.definition.alias] = { id: data.id, role: result.definition.role }
  await writeProfileState(env.expectedRef, stateProfiles)
  console.log(result.definition.alias + ': CREATED (' + maskEmail(result.authUser.email) + ')')
}
console.log('mode: execute; profiles_state: written_without_secrets')

function loadEnv() {
  const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'E2E_EXPECTED_PROJECT_REF', ...users.map((user) => user.emailKey)]
  const values = Object.fromEntries(keys.map((key) => [key, (process.env[key] ?? '').trim()]))
  return { url: values.NEXT_PUBLIC_SUPABASE_URL, serviceKey: values.SUPABASE_SERVICE_ROLE_KEY, expectedRef: values.E2E_EXPECTED_PROJECT_REF, values }
}

function loadState() {
  try { return JSON.parse(fsSync.readFileSync(path.join(process.cwd(), '.e2e-state/auth-users.json'), 'utf8')) } catch { fail('auth_state_unavailable') }
}

function validateConfig(env, state) {
  if (!env.url || !env.serviceKey || !env.expectedRef) fail('missing_configuration')
  let url
  try { url = new URL(env.url) } catch { fail('invalid_url') }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) fail('invalid_supabase_url')
  if (url.hostname.split('.')[0] !== env.expectedRef) fail('url_ref_mismatch')
  let linked
  try { linked = fsSync.readFileSync(path.join(process.cwd(), 'tests/supabase-e2e-db/supabase/.temp/project-ref'), 'utf8').trim() } catch { fail('linked_ref_unavailable') }
  if (linked !== env.expectedRef || state.projectRef !== env.expectedRef) fail('project_ref_mismatch')
  const aliases = Object.keys(state.users ?? {})
  if (aliases.length !== users.length || !users.every((user) => aliases.includes(user.alias))) fail('auth_state_alias_mismatch')
  const ids = users.map((user) => state.users[user.alias]?.id ?? '')
  if (!ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) || new Set(ids).size !== ids.length) fail('auth_state_uuid_mismatch')
  if (/(password|secret|token|session|refresh|jwt|key)/i.test(JSON.stringify(state))) fail('auth_state_contains_secret')
  for (const user of users) {
    const email = env.values[user.emailKey].toLowerCase()
    if (!email || state.users[user.alias]?.email?.toLowerCase() !== email) fail('auth_state_email_mismatch_' + user.alias)
  }
}

async function verifyAuthUsers(client, env, state) {
  const all = []
  let page = 1
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) fail('auth_list_failed')
    all.push(...(data.users ?? []))
    if (!data.users || data.users.length < 1000) break
    page += 1
  }
  return users.map((definition) => {
    const expected = state.users[definition.alias]
    const user = all.find((candidate) => candidate.id === expected.id)
    const email = env.values[definition.emailKey].toLowerCase()
    if (!user || user.email?.toLowerCase() !== email || user.user_metadata?.e2e_test !== true || user.user_metadata?.e2e_alias !== definition.alias || !user.email_confirmed_at) fail('auth_user_mismatch_' + definition.alias)
    return { alias: definition.alias, id: user.id, email }
  })
}

async function readProfiles(client, ids) {
  const { data, error } = await client.from('profiles').select('id, full_name, email, role').in('id', ids)
  if (error) fail('profiles_read_failed')
  return data ?? []
}

async function writeProfileState(ref, profiles) {
  const dir = path.join(process.cwd(), '.e2e-state')
  const target = path.join(dir, 'profiles.json')
  const temp = target + '.tmp'
  await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  await fs.writeFile(temp, JSON.stringify({ projectRef: ref, createdAt: new Date().toISOString(), profiles }, null, 2) + '\n', { mode: 0o600 })
  await fs.rename(temp, target)
}

function maskEmail(email) { const [local, domain] = email.split('@'); return local.slice(0, 2) + '***@' + domain }
function fail(code) { console.error('ERROR: ' + code); process.exit(1) }
