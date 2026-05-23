import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  canManageLoans,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'
import { RequestsTable } from './requests-table'
import { RequestActionsPanel } from './request-actions-panel'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function DashboardSolicitudesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userId = user.id

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', userId)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

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
      items (
        id,
        name,
        code,
        stock_available
      )
    ),

    request_groups (
      id,
      group_name,
      leader:profiles(full_name),
      request_group_items (
        quantity,
        items (
          name,
          code
        )
      )
    )
  `)
  .order('requested_at', { ascending: false })
  .limit(100)

  if (error) {
    throw new Error(error.message)
  }

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
        item: firstOrNull(ri.items) as
          | {
              id?: string
              name?: string
              code?: string
              stock_available?: number
            }
          | null,
      })) ?? [],
    request_groups:
      req.request_groups?.map((group) => ({
        id: group.id,
        group_name: group.group_name,
        leader: firstOrNull(group.leader),
        request_group_items:
          group.request_group_items?.map((gi) => ({
            quantity: gi.quantity,
            item: firstOrNull(gi.items),
          })) ?? [],
      })) ?? [],
  })) ?? []

    const requestsWithActions = requests.map((req) => ({
    ...req,
    actions: <RequestActionsPanel request={req} />,
    }))

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de solicitudes</h1>
            <p className="text-slate-600">
              Revisión y aprobación de solicitudes de préstamo
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-slate-800 text-white px-4 py-2 hover:bg-slate-900 transition"
          >
            Volver al dashboard
          </Link>
        </div>
        <RequestsTable requests={requestsWithActions} limit={100} />
      </div>
    </main>
  )
}