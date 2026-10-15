import type { SupabaseClient } from '@supabase/supabase-js'
import { ADMIN_REQUESTS_LIMIT } from '@/lib/query-limits'

export const OPERATIONAL_PAGE_SIZE = 25
export const REQUEST_STATUSES = ['', 'pending', 'approved', 'rejected', 'delivered',
  'partial_delivery', 'returned', 'partial_return', 'cancelled'] as const
export type RequestStatusFilter = typeof REQUEST_STATUSES[number]

export function parseRequestFilters(params: Record<string, string | string[] | undefined>) {
  const status: RequestStatusFilter = REQUEST_STATUSES.find((value) => value === params.status) ?? ''
  const value = typeof params.page === 'string' && /^[1-9]\d*$/.test(params.page)
    ? Number(params.page) : 1
  return { status, page: Number.isSafeInteger(value) ? value : 1,
    search: typeof params.q === 'string' ? params.q.slice(0, 500) : '' }
}

export function requestsHref(status: RequestStatusFilter, page = 1, search = '') {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (page > 1) params.set('page', String(page))
  if (search) params.set('q', search)
  const query = params.toString()
  return `/dashboard/solicitudes${query ? `?${query}` : ''}`
}

const REQUEST_SELECT = `
    id,
    status,
    requested_at,
    purpose,
    comments,
    scheduled_return_date,
    rejection_reason,
    requester:profiles!requests_user_id_fkey(full_name, email),
    loans (
      id,
      status,
      delivery_date,
      expected_return_date,
      loan_items (
        item_id,
        quantity
      )
    ),
    request_items (
      id,
      quantity_requested,
      quantity_approved,
      quantity_delivered,
      items (
        id,
        name,
        code,
        stock_available,
        track_individual,
        item_units(asset_code)
      )
    ),

    request_groups (
      id,
      group_name,
      leader:profiles(full_name),
      request_group_items (
        item_id,
        quantity,
        items (
          id,
          name,
          code,
          stock_available,
          track_individual,
          item_units(asset_code)
        )
      )
    )
  `

// Only the authenticated client supplied by getAuthProfile is used by the page.
export async function loadRequests(supabase: SupabaseClient, status: RequestStatusFilter, requestedPage: number) {
  const operational = status === '' || status === 'pending' || status === 'approved'
  const details = () => supabase.from('requests').select(REQUEST_SELECT)
  const ordered = () => details().order('requested_at', { ascending: true }).order('id', { ascending: true })

  if (!operational) {
    // Preserve the existing historical subset and all its client-side filters,
    // including matches against loan.status and derived partial delivery.
    const result = await ordered().limit(ADMIN_REQUESTS_LIMIT)
    if (result.error) throw new Error(result.error.message)
    return { rows: result.data ?? [], page: 1, total: 0, historicalCount: result.data?.length ?? 0, operational }
  }

  const countQuery = supabase.from('requests').select('id', { count: 'exact', head: true })
  const countResult = await (status === ''
    ? countQuery.in('status', ['pending', 'approved']) : countQuery.eq('status', status))
  if (countResult.error) throw new Error(countResult.error.message)
  if (countResult.count === null) throw new Error('No se pudo contar las solicitudes operativas.')
  const total = countResult.count
  const page = Math.min(Math.max(1, requestedPage), Math.max(1, Math.ceil(total / OPERATIONAL_PAGE_SIZE)))
  const start = (page - 1) * OPERATIONAL_PAGE_SIZE
  const [active, history] = await Promise.all([
    (status === '' ? ordered().in('status', ['pending', 'approved']) : ordered().eq('status', status))
      .range(start, start + OPERATIONAL_PAGE_SIZE - 1),
    // Disjoint sets: the operational page never consumes the historical limit.
    status === '' ? ordered().not('status', 'in', '(pending,approved)').limit(ADMIN_REQUESTS_LIMIT) : null,
  ])
  if (active.error) throw new Error(active.error.message)
  if (history?.error) throw new Error(history.error.message)
  const combined = [...(active.data ?? []), ...(history?.data ?? [])]
  const seen = new Set<string>()
  const conflicts = new Set<string>()
  for (const request of combined) {
    if (seen.has(request.id)) conflicts.add(request.id)
    seen.add(request.id)
  }

  if (conflicts.size === 0) {
    return { rows: combined, page, total, historicalCount: history?.data?.length ?? 0, operational }
  }

  // Independent reads can observe the same request on either side of a state
  // transition. Neither old version wins: reread all conflicting IDs together,
  // with the same authenticated client and the full detail projection.
  const refreshed = await details().in('id', [...conflicts]).limit(conflicts.size)
  if (refreshed.error) throw new Error(refreshed.error.message)
  const currentById = new Map((refreshed.data ?? []).map((request) => [request.id, request]))
  const rows: typeof combined = []
  seen.clear()
  for (const request of combined) {
    if (seen.has(request.id)) continue
    seen.add(request.id)
    const current = conflicts.has(request.id) ? currentById.get(request.id) : request
    // A missing reread row may have been deleted or become invisible under RLS.
    // Never fall back to a previously visible version of a conflicting record.
    if (current) rows.push(current)
  }

  return { rows, page, total,
    historicalCount: rows.filter((request) => !['pending', 'approved'].includes(request.status)).length,
    operational }
}
