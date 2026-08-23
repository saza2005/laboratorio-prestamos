import Link from 'next/link'
import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import { getOwnRequests, getRequestPortalAuth } from '../shared'
import { USER_HISTORY_LIMIT } from '@/lib/query-limits'
import { RequestsList } from './requests-list'
import { PageHeader } from '@/components/page-header'

export default async function MisSolicitudesPage() {
  const { supabase, user, profile } = await getRequestPortalAuth()
  const requests = await getOwnRequests(supabase, user.id)
  const canCreateGroups = canCreateGroupRequests(profile.role)
  const groupedRequests = requests.filter(
    (req) => req.request_groups.length > 0
  ).length
  const individualRequests = requests.length - groupedRequests

  return (
    <main className="app-page">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader eyebrow="Seguimiento" title="Mis solicitudes" description={`Historial y estado de tus últimas ${USER_HISTORY_LIMIT} solicitudes.`} actions={<Link
            href="/solicitudes"
            className="button-secondary"
          >
            Volver al portal
          </Link>} />

        <section className="grid gap-4 md:grid-cols-3">
          <div className="surface-card p-5">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold">{requests.length}</p>
          </div>
          <div className="surface-card p-5">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {requests.filter((req) => req.status === 'pending').length}
            </p>
          </div>
          <div className="surface-card p-5">
            <p className="text-sm text-slate-500">
              {canCreateGroups ? 'Grupales' : 'Individuales'}
            </p>
            <p className="mt-2 text-3xl font-bold">
              {canCreateGroups ? groupedRequests : individualRequests}
            </p>
          </div>
        </section>

        <section className="surface-card p-4 sm:p-6">
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
