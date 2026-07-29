import Link from 'next/link'
import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import { getOwnRequests, getRequestPortalAuth } from '../shared'
import { USER_HISTORY_LIMIT } from '@/lib/query-limits'
import { RequestsList } from './requests-list'

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mis solicitudes</h1>
            <p className="mt-1 text-slate-600">
              Historial y estado de tus últimas {USER_HISTORY_LIMIT} solicitudes.
            </p>
          </div>

          <Link
            href="/solicitudes"
            className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-900"
          >
            Volver al portal
          </Link>
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
              <p className="text-sm text-slate-500">
                Selecciona una solicitud para revisar su detalle sin saturar la pantalla.
              </p>
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

          <RequestsList requests={requests} />
        </section>
      </div>
    </main>
  )
}
