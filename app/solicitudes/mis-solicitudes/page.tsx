import Link from 'next/link'
import { CancelRequestButton } from '../cancel-request-button'
import { formatDateTime } from '@/lib/format-date'
import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import {
  firstOrNull,
  formatRequestStatus,
  getOwnRequests,
  getRequestPortalAuth,
  statusBadgeClass,
} from '../shared'

export default async function MisSolicitudesPage() {
  const { supabase, user, profile } = await getRequestPortalAuth()
  const requests = await getOwnRequests(supabase, user.id)
  const canCreateGroups = canCreateGroupRequests(profile.role)
  const groupedRequests = requests.filter(
    (req) => req.request_groups.length > 0
  ).length
  const individualRequests = requests.length - groupedRequests

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/solicitudes" className="text-sm font-medium text-blue-700 hover:underline">
            Volver al portal
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Mis solicitudes</h1>
          <p className="mt-1 text-slate-600">Historial y estado de tus últimas 50 solicitudes.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold">{requests.length}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {requests.filter((req) => req.status === 'pending').length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">
              {canCreateGroups ? 'Grupales' : 'Individuales'}
            </p>
            <p className="mt-2 text-3xl font-bold">
              {canCreateGroups ? groupedRequests : individualRequests}
            </p>
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Listado de solicitudes</h2>
              <p className="text-sm text-slate-500">Mostrando tus últimas 50 solicitudes</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Individuales: {individualRequests}
              </span>
              {canCreateGroups && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Grupales: {groupedRequests}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {requests.length > 0 ? (
              requests.map((req) => (
                <div key={req.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-500">
                      {formatDateTime(req.requested_at)}
                    </p>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(req.status)}`}>
                      {formatRequestStatus(req.status)}
                    </span>
                  </div>

                  {req.purpose && (
                    <p className="mt-2 text-sm"><span className="font-medium">Propósito:</span> {req.purpose}</p>
                  )}
                  {req.scheduled_return_date && (
                    <p className="text-sm"><span className="font-medium">Devolución estimada:</span> {req.scheduled_return_date}</p>
                  )}
                  {req.comments && (
                    <p className="text-sm"><span className="font-medium">Comentarios:</span> {req.comments}</p>
                  )}

                  {req.request_groups.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {req.request_groups.map((group) => {
                        const leader = firstOrNull(group.leader)
                        return (
                          <div key={group.id} className="rounded-lg border bg-slate-50 p-3">
                            <p className="text-sm font-medium">
                              {group.group_name} - {leader?.full_name ?? 'Sin asignar'}
                            </p>
                            <ul className="mt-2 space-y-1 text-sm">
                              {group.request_group_items.map((gi, index) => {
                                const item = firstOrNull(gi.items)
                                return <li key={index}>{item?.name ?? 'Ítem'} - {gi.quantity}</li>
                              })}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <ul className="mt-3 space-y-1 text-sm">
                      {req.request_items.map((ri) => (
                        <li key={ri.id}>{ri.items?.name ?? 'Ítem'} - {ri.quantity_requested}</li>
                      ))}
                    </ul>
                  )}

                  {req.status === 'pending' && <CancelRequestButton requestId={req.id} />}
                </div>
              ))
            ) : (
              <p className="text-slate-500">Aún no tienes solicitudes registradas.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
