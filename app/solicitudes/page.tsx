import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import { getRequestPortalAuth, getOwnLoans, getOwnRequests } from './shared'
import { formatUserRole, userRoleBadgeClass } from '@/lib/status-format'
import { PageHeader } from '@/components/page-header'
import { MetricCard } from '@/components/metric-card'
import { ModuleCard } from '@/components/module-card'

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
    <main className="app-page">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Portal académico"
          title="Portal de laboratorio"
          description={profile.role === 'teacher'
            ? 'Gestiona solicitudes individuales, grupales y revisa tus préstamos.'
            : 'Crea solicitudes, revisa su estado y consulta tus préstamos activos.'}
          meta={<span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${userRoleBadgeClass(profile.role)}`}>{formatUserRole(profile.role)}</span>}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Solicitudes pendientes" value={pendingRequests} icon="clipboard" tone="warning" />
          <MetricCard label="Préstamos activos" value={activeLoans} icon="loan" />
          <MetricCard label="Préstamos vencidos" value={overdueLoans} icon="loan" tone="danger" />
          <MetricCard label={canCreateGroups ? 'Solicitudes grupales' : 'Solicitudes registradas'} value={canCreateGroups ? groupedRequests : requests.length} icon="users" tone="neutral" />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Módulos del portal</h2>
            <p className="mt-1 text-sm text-slate-600">
              Selecciona una sección para trabajar sin cargar todo en una sola pantalla.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ModuleCard href="/solicitudes/nueva" title="Nueva solicitud individual" description="Solicita materiales para uso personal." icon="clipboard" />

            {canCreateGroups && (
              <ModuleCard href="/solicitudes/grupal" title="Nueva solicitud grupal" description="Crea grupos y asigna materiales por equipo." icon="users" />
            )}

            <ModuleCard href="/solicitudes/mis-solicitudes" title="Mis solicitudes" description="Revisa estados, materiales y solicitudes pendientes." icon="book" />

            <ModuleCard href="/solicitudes/mis-prestamos" title="Mis préstamos" description="Consulta préstamos activos, pendientes y devueltos." icon="loan" />

            <ModuleCard href="/solicitudes/catalogo" title="Catálogo disponible" description="Busca materiales por nombre, categoría o código patrimonial." icon="boxes" />
          </div>
        </section>
      </div>
    </main>
  )
}
