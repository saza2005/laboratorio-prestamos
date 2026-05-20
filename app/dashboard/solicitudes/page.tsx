import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { approveRequest, rejectRequest, deliverRequest } from './actions'
import {
  canManageLoans,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'
import { RequestsTable } from './requests-table'

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
    actions: (
        <>
        {req.status === 'pending' && (
            <div className="grid lg:grid-cols-2 gap-4">

            {req.request_groups && req.request_groups.length > 0 && (
              <div className="rounded-xl border p-4 mb-4 bg-slate-50">
                <h3 className="font-semibold mb-3">Grupos</h3>

                <div className="space-y-3">
                  {req.request_groups.map((group) => (
                    <div key={group.id} className="border rounded-lg p-3 bg-white">
                      <p className="font-medium text-sm">
                        {group.group_name} — {group.leader?.full_name ?? 'Sin asignar'}
                      </p>

                      <ul className="mt-2 text-sm space-y-1">
                        {group.request_group_items.map((gi, i) => (
                          <li key={i}>
                            {gi.item?.name ?? 'Ítem'} - {gi.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {req.request_groups && req.request_groups.length > 0 ? (
              <form action={approveRequest} className="space-y-4 rounded-xl border p-4">
                <h3 className="font-semibold">Aprobar solicitud por grupos</h3>

                <input type="hidden" name="request_id" value={req.id} />

                <p className="text-sm text-slate-600">
                  Esta solicitud contiene grupos asignados. La aprobación se realizará de
                  forma completa para todos los grupos y materiales solicitados.
                </p>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 text-white px-5 py-2.5 font-medium hover:bg-blue-700 transition"
                >
                  Aprobar solicitud completa
                </button>
              </form>
            ) : (
              <form action={approveRequest} className="space-y-4 rounded-xl border p-4">
                <h3 className="font-semibold">Aprobar solicitud</h3>

                <input type="hidden" name="request_id" value={req.id} />

                <div className="space-y-3">
                  {req.request_items.map((ri) => (
                    <div
                      key={ri.id}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
                    >
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                          {ri.item?.name ?? 'Ítem'} [{ri.item?.code ?? '-'}]
                        </label>
                        <p className="text-xs text-slate-500">
                          Solicitado: {ri.quantity_requested} | Disponible:{' '}
                          {ri.item?.stock_available ?? 0}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Cantidad aprobada
                        </label>
                        <input
                          type="number"
                          name="quantity_approved"
                          min="0"
                          max={ri.quantity_requested}
                          defaultValue={ri.quantity_requested}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                        <input
                          type="hidden"
                          name="request_item_id"
                          value={ri.id}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 text-white px-5 py-2.5 font-medium hover:bg-blue-700 transition"
                >
                  Aprobar
                </button>
              </form>
            )}

            <form action={rejectRequest} className="space-y-4 rounded-xl border p-4">
                <h3 className="font-semibold">Rechazar solicitud</h3>

                <input type="hidden" name="request_id" value={req.id} />

                <div>
                <label className="block text-sm font-medium mb-1">
                    Motivo del rechazo
                </label>
                <textarea
                    name="rejection_reason"
                    rows={5}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Explique por qué se rechaza la solicitud"
                />
                </div>

                <button
                type="submit"
                className="rounded-lg bg-red-600 text-white px-5 py-2.5 font-medium hover:bg-red-700 transition"
                >
                Rechazar
                </button>
            </form>
            </div>
        )}

        {req.status === 'approved' && (
            <form action={deliverRequest} className="rounded-xl border p-4 space-y-4">
            <h3 className="font-semibold">Registrar entrega</h3>

            <input type="hidden" name="request_id" value={req.id} />

            <div>
                <label className="block text-sm font-medium mb-1">
                Notas de entrega
                </label>
                <textarea
                name="delivery_notes"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Observaciones al momento de entregar"
                />
            </div>

            <button
                type="submit"
                className="rounded-lg bg-green-600 text-white px-5 py-2.5 font-medium hover:bg-green-700 transition"
            >
                Confirmar entrega y crear préstamo
            </button>
            </form>
        )}
        </>
    ),
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

          <a
            href="/dashboard"
            className="inline-block rounded-lg bg-slate-800 text-white px-4 py-2 hover:bg-slate-900 transition"
          >
            Volver al dashboard
          </a>
        </div>
        <RequestsTable requests={requestsWithActions} />
      </div>
    </main>
  )
}