import Link from 'next/link'
import { LogoutButton } from '@/app/logout-button'
import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import { getRequestPortalAuth, getOwnLoans, getOwnRequests } from './shared'

export default async function SolicitudesPage() {
  const { supabase, user, profile } = await getRequestPortalAuth()
  const canCreateGroups = canCreateGroupRequests(profile.role)
  const [requests, loans] = await Promise.all([
    getOwnRequests(supabase, user.id),
    getOwnLoans(supabase, user.id),
  ])

  const pendingRequests = requests.filter((req) => req.status === 'pending').length
  const activeLoans = loans.filter((loan) =>
    ['active', 'partial_return', 'overdue'].includes(loan.status)
  ).length
  const overdueLoans = loans.filter((loan) => loan.status === 'overdue').length
  const groupedRequests = requests.filter(
    (req) => req.request_groups.length > 0
  ).length

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-lg bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Portal de laboratorio</h1>
              <p className="mt-2 text-slate-600">Bienvenido, {profile.full_name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {profile.role === 'teacher'
                  ? 'Gestiona solicitudes individuales, grupales y revisa tus préstamos.'
                  : 'Crea solicitudes, revisa su estado y consulta tus préstamos activos.'}
              </p>
            </div>

            <LogoutButton className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 sm:w-auto" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Solicitudes pendientes</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">{pendingRequests}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Préstamos activos</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{activeLoans}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Préstamos vencidos</p>
            <p className="mt-2 text-3xl font-bold text-red-700">{overdueLoans}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">
              {canCreateGroups ? 'Solicitudes grupales' : 'Solicitudes registradas'}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {canCreateGroups ? groupedRequests : requests.length}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Módulos del portal</h2>
            <p className="mt-1 text-sm text-slate-500">
              Selecciona una sección para trabajar sin cargar todo en una sola pantalla.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Link href="/solicitudes/nueva" className="rounded-lg bg-white p-5 shadow transition hover:bg-slate-50">
              <h3 className="font-semibold">Nueva solicitud individual</h3>
              <p className="mt-2 text-sm text-slate-600">Solicita materiales para uso personal.</p>
            </Link>

            {canCreateGroups && (
              <Link href="/solicitudes/grupal" className="rounded-lg bg-white p-5 shadow transition hover:bg-slate-50">
                <h3 className="font-semibold">Nueva solicitud grupal</h3>
                <p className="mt-2 text-sm text-slate-600">Crea grupos y asigna materiales por equipo.</p>
              </Link>
            )}

            <Link href="/solicitudes/mis-solicitudes" className="rounded-lg bg-white p-5 shadow transition hover:bg-slate-50">
              <h3 className="font-semibold">Mis solicitudes</h3>
              <p className="mt-2 text-sm text-slate-600">Revisa estados, materiales y solicitudes pendientes.</p>
            </Link>

            <Link href="/solicitudes/mis-prestamos" className="rounded-lg bg-white p-5 shadow transition hover:bg-slate-50">
              <h3 className="font-semibold">Mis préstamos</h3>
              <p className="mt-2 text-sm text-slate-600">Consulta préstamos activos, pendientes y devueltos.</p>
            </Link>

            <Link href="/solicitudes/catalogo" className="rounded-lg bg-white p-5 shadow transition hover:bg-slate-50">
              <h3 className="font-semibold">Catálogo disponible</h3>
              <p className="mt-2 text-sm text-slate-600">Busca materiales por nombre, categoría o código patrimonial.</p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
