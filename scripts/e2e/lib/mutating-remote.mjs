import { createClient } from '@supabase/supabase-js'
import { readWithBoundedRetry } from './clean-state-diagnostics.mjs'
export function projectRefFromUrl(url) {
  const match = String(url).match(/^https:\/\/([a-z0-9]+)\.supabase\.co(?:\/|$)/i)
  return match?.[1] ?? ''
}
export function createAdminReadClient({ fetch: customFetch, url: explicitUrl } = {}) {
  const url = String(explicitUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  if (!url || !key) throw new Error('missing_admin_read_configuration')
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  if (customFetch) options.global = { fetch: customFetch }
  return createClient(url, key, options)
}
const scans = [
  ['requests', 'id,purpose,comments'],
  ['request_groups', 'id,group_name'],
  ['loans', 'id,notes'],
  ['returns', 'id,notes'],
  ['maintenance_records', 'id,activity,responsible,observations'],
  ['items', 'id,code,name,description,category,location'],
  ['inventory_movements', 'id,notes,reference_table'],
]
export async function findMutatingNamespace({ onRead } = {}) {
  const client = createAdminReadClient()
  const hits = []
  for (const [ordinal, [table, columns]] of scans.entries()) {
    const result = await readWithBoundedRetry(
      async () => {
        const { data, error } = await client.from(table).select(columns).limit(1000)
        if (error) throw error
        return data ?? []
      },
      { ordinal: ordinal + 1, readClass: 'NAMESPACE_SCAN_' + table.toUpperCase() },
      onRead,
    )
    for (const row of result.value) {
      if (/E2E_MUT_(REQ|LOAN|RETURN|MAINT|ITEM)_/i.test(JSON.stringify(row))) hits.push({ table })
    }
  }
  return hits
}
