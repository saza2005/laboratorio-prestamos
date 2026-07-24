import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  canManageLoans,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'
import { RequestsTable } from './requests-table'
import { RequestActionsPanel } from './request-actions-panel'
import { ADMIN_REQUESTS_LIMIT } from '@/lib/query-limits'
import { firstOrNull } from '@/lib/supabase/query-utils'

export default async function DashboardSolicitudesPage() {
  let auth

  try {
    auth = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  const { supabase, profile } = auth

  if (!canManageLoans(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

const { data: rawRequests, error } = await supabase
  .from('requests')
  .select(`
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
      expected_return_date
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
  `)
  .order('requested_at', { ascending: false })
  .limit(ADMIN_REQUESTS_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

const getAssetCodes = (
  units: { asset_code?: string | null }[] | null | undefined
) =>
  units
    ?.map((unit) => unit.asset_code)
    .filter((code): code is string => Boolean(code)) ?? []

const requests =
  rawRequests?.map((req) => ({
    id: req.id,
    status: req.status,
    requested_at: req.requested_at,
    purpose: req.purpose,
    comments: req.comments,
    scheduled_return_date: req.scheduled_return_date,
    rejection_reason: req.rejection_reason,
    requester: firstOrNull(req.requester) as
      | { full_name?: string; email?: string }
      | null,
    loan: firstOrNull(req.loans) as
      | {
          id?: string
          status?: string
          delivery_date?: string
          expected_return_date?: string
        }
      | null,
    request_items:
      req.request_items?.map((ri) => ({
        id: ri.id,
        quantity_requested: ri.quantity_requested,
        quantity_approved: ri.quantity_approved,
        quantity_delivered: ri.quantity_delivered,
        item: (() => {
          const item = firstOrNull(ri.items) as
            | {
                id?: string
                name?: string
                code?: string
                stock_available?: number
                track_individual?: boolean
                item_units?: { asset_code?: string | null }[]
              }
            | null

          return item
            ? { ...item, asset_codes: getAssetCodes(item.item_units) }
            : null
        })(),
      })) ?? [],
    request_groups:
      req.request_groups?.map((group) => ({
        id: group.id,
        group_name: group.group_name,
        leader: firstOrNull(group.leader),
        request_group_items:
          group.request_group_items?.map((gi) => ({
            quantity: gi.quantity,
            item: (() => {
              const item = firstOrNull(gi.items) as
                | {
                    id?: string
                    name?: string
                    code?: string
                    stock_available?: number
                    track_individual?: boolean
                    item_units?: { asset_code?: string | null }[]
                  }
                | null

              return item
                ? { ...item, asset_codes: getAssetCodes(item.item_units) }
                : null
            })(),
          })) ?? [],
      })) ?? [],
  })) ?? []

  const trackedItemIds = Array.from(
    new Set(
      requests
        .filter((request) => request.status === 'approved')
        .flatMap((request) => [
          ...request.request_items
            .filter((entry) => entry.item?.track_individual)
            .map((entry) => entry.item?.id),
          ...request.request_groups.flatMap((group) =>
            group.request_group_items
              .filter((entry) => entry.item?.track_individual)
              .map((entry) => entry.item?.id)
          ),
        ])
        .filter((itemId): itemId is string => Boolean(itemId))
    )
  )

  let availableUnits: Array<{
    id: string
    item_id: string
    asset_code: string | null
    serial_code: string | null
    brand: string | null
    model: string | null
  }> = []

  if (trackedItemIds.length > 0) {
    const [firstUnitsPage, secondUnitsPage] = await Promise.all([
      supabase
        .from('item_units')
        .select('id, item_id, asset_code, serial_code, brand, model')
        .in('item_id', trackedItemIds)
        .eq('availability_status', 'available')
        .eq('condition', 'good')
        .order('asset_code', { ascending: true })
        .range(0, 999),
      supabase
        .from('item_units')
        .select('id, item_id, asset_code, serial_code, brand, model')
        .in('item_id', trackedItemIds)
        .eq('availability_status', 'available')
        .eq('condition', 'good')
        .order('asset_code', { ascending: true })
        .range(1000, 1999),
    ])

    if (firstUnitsPage.error) throw new Error(firstUnitsPage.error.message)
    if (secondUnitsPage.error) throw new Error(secondUnitsPage.error.message)

    availableUnits = [
      ...(firstUnitsPage.data ?? []),
      ...(secondUnitsPage.data ?? []),
    ]
  }

  const requestsWithActions = requests.map((req) => {
    const requestedItemIds = new Set([
      ...req.request_items.map((entry) => entry.item?.id).filter(Boolean),
      ...req.request_groups.flatMap((group) =>
        group.request_group_items.map((entry) => entry.item?.id).filter(Boolean)
      ),
    ])

    return {
      ...req,
      actions: (
        <RequestActionsPanel
          key={req.id}
          request={req}
          availableUnits={availableUnits.filter((unit) =>
            requestedItemIds.has(unit.item_id)
          )}
        />
      ),
    }
  })

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de solicitudes</h1>
            <p className="text-slate-600">
              Revisión y aprobación de solicitudes de préstamo
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-block text-center rounded-lg bg-slate-800 text-white px-4 py-2 hover:bg-slate-900 transition"
          >
            Volver al dashboard
          </Link>
        </div>
        <RequestsTable requests={requestsWithActions} limit={100} />
      </div>
    </main>
  )
}
