import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/logout-button'
import { LinkGoogleButton } from '@/app/auth/link-google-button'
import { DashboardCharts } from './dashboard-charts'
import { ModuleTabs } from '@/components/module-tabs'
import {
  canSeeInventoryModule,
  canSeeLoansModule,
  canSeeReturnsModule,
  canSeeReportsModule,
} from '@/lib/supabase/auth/roles'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { formatDateTime, formatMonthName } from '@/lib/format-date'
import { parseReportPeriod } from '@/lib/report-period'
import {
  DASHBOARD_ACTIVITY_LIMIT,
  DASHBOARD_LOW_STOCK_LIMIT,
  DASHBOARD_RECENT_LOANS_LIMIT,
} from '@/lib/query-limits'
import { getEcuadorDate, getEffectiveLoanStatus } from '@/lib/loan-status'
import {
  formatInventoryStatus,
  formatLoanStatus,
  formatMaintenanceType,
  formatMovementType,
  formatRequestStatus,
  loanStatusBadgeClass as statusBadgeClass,
  requestStatusBadgeClass,
} from '@/lib/status-format'
import { firstOrNull } from '@/lib/supabase/query-utils'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  let auth

  try {
    auth = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  const { supabase, user, profile } = auth
  const params = await searchParams
  const now = new Date()

  const period = parseReportPeriod(params.month, params.year, now)

  if (!period) {
    redirect('/dashboard')
  }

  const selectedMonth = period.month
  const selectedYear = period.year
  const reportBaseYear = now.getFullYear()
  const reportYears = Array.from(
    new Set([
      reportBaseYear - 2,
      reportBaseYear - 1,
      reportBaseYear,
      reportBaseYear + 1,
      reportBaseYear + 2,
      selectedYear,
    ])
  ).sort((a, b) => a - b)

  const { data: maintenance, error: maintenanceError } = await supabase
    .from('maintenance_records')
    .select('maintenance_type, maintenance_date')
    .gte('maintenance_date', period.startDate)
    .lt('maintenance_date', period.endDate)

  if (maintenanceError) {
    throw new Error(maintenanceError.message)
  }

  const maintenanceMap = new Map<string, number>()

  for (const m of maintenance ?? []) {
    const type =
      m.maintenance_type === 'preventive'
        ? 'Preventivo'
        : 'Correctivo'

    maintenanceMap.set(type, (maintenanceMap.get(type) ?? 0) + 1)
  }

  const maintenanceData = Array.from(maintenanceMap.entries()).map(
    ([name, value]) => ({ name, value })
  )

  const canSeeInventory = canSeeInventoryModule(profile.role)
  const canSeeLoans = canSeeLoansModule(profile.role)
  const canSeeReturns = canSeeReturnsModule(profile.role)
  const canSeeReports = canSeeReportsModule(profile.role)

  const [
    inventorySummaryResult,
    lowStockItemsResult,
    outOfStockCountResult,
    criticalStockCountResult,
  ] = await Promise.all([
    supabase.rpc('get_dashboard_inventory_summary'),
    supabase
      .from('items')
      .select('id, code, name, stock_available, status')
      .eq('status', 'active')
      .lte('stock_available', 2)
      .order('stock_available', { ascending: true })
      .limit(DASHBOARD_LOW_STOCK_LIMIT),
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('stock_available', 0),
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('stock_available', 0)
      .lte('stock_available', 2),
  ])

  if (inventorySummaryResult.error) {
    throw new Error(inventorySummaryResult.error.message)
  }

  if (lowStockItemsResult.error) {
    throw new Error(lowStockItemsResult.error.message)
  }

  if (outOfStockCountResult.error) {
    throw new Error(outOfStockCountResult.error.message)
  }

  if (criticalStockCountResult.error) {
    throw new Error(criticalStockCountResult.error.message)
  }

  const currentDate = getEcuadorDate()
  const [currentYear, currentMonth, currentDay] = currentDate
    .split('-')
    .map(Number)
  const upcomingLimitDate = new Date(
    Date.UTC(currentYear, currentMonth - 1, currentDay + 7)
  )
    .toISOString()
    .slice(0, 10)
  const [
    activeLoansResult,
    partialLoansResult,
    overdueLoansResult,
    returnedLoansResult,
    recentLoansResult,
    dueSoonLoansResult,
    pendingRequestsCountResult,
    approvedRequestsCountResult,
    actionableRequestsResult,
  ] = await Promise.all([
    supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`expected_return_date.is.null,expected_return_date.gte.${currentDate}`),
    supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'partial_return')
      .or(`expected_return_date.is.null,expected_return_date.gte.${currentDate}`),
    supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'partial_return', 'overdue'])
      .lt('expected_return_date', currentDate),
    supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'returned'),
    supabase
      .from('loans')
      .select(`
        id,
        status,
        delivery_date,
        expected_return_date,
        returned_at,
        profiles:profiles!loans_user_id_fkey(full_name, email)
      `)
      .order('delivery_date', { ascending: false })
      .limit(DASHBOARD_LOW_STOCK_LIMIT),
    supabase
      .from('loans')
      .select(`
        id,
        status,
        delivery_date,
        expected_return_date,
        profiles:profiles!loans_user_id_fkey(full_name, email)
      `)
      .in('status', ['active', 'partial_return', 'overdue'])
      .not('expected_return_date', 'is', null)
      .lte('expected_return_date', upcomingLimitDate)
      .order('expected_return_date', { ascending: true })
      .limit(DASHBOARD_RECENT_LOANS_LIMIT),
    supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),
    supabase
      .from('requests')
      .select(`
        id,
        requested_at,
        status,
        purpose,
        scheduled_return_date,
        profiles:profiles!requests_user_id_fkey(full_name, email)
      `)
      .in('status', ['pending', 'approved'])
      .order('requested_at', { ascending: false })
      .limit(DASHBOARD_RECENT_LOANS_LIMIT),
  ])

  if (activeLoansResult.error) {
    throw new Error(activeLoansResult.error.message)
  }

  if (partialLoansResult.error) {
    throw new Error(partialLoansResult.error.message)
  }

  if (overdueLoansResult.error) {
    throw new Error(overdueLoansResult.error.message)
  }

  if (returnedLoansResult.error) {
    throw new Error(returnedLoansResult.error.message)
  }

  if (recentLoansResult.error) {
    throw new Error(recentLoansResult.error.message)
  }

  if (dueSoonLoansResult.error) {
    throw new Error(dueSoonLoansResult.error.message)
  }

  if (pendingRequestsCountResult.error) {
    throw new Error(pendingRequestsCountResult.error.message)
  }

  if (approvedRequestsCountResult.error) {
    throw new Error(approvedRequestsCountResult.error.message)
  }

  if (actionableRequestsResult.error) {
    throw new Error(actionableRequestsResult.error.message)
  }

  const { data: movements, error: movementsError } = await supabase
    .from('inventory_movements')
    .select(`
      id,
      movement_type,
      quantity,
      notes,
      created_at,
      items:items(id, name, code),
      profiles:profiles!inventory_movements_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_RECENT_LOANS_LIMIT)

  if (movementsError) {
    throw new Error(movementsError.message)
  }

  const [recentRequestsResult, recentReturnsResult, recentMaintenanceResult] =
    await Promise.all([
      supabase
        .from('requests')
        .select(`
          id,
          requested_at,
          updated_at,
          approved_at,
          status,
          purpose,
          requester:profiles!requests_user_id_fkey(full_name, email),
          reviewer:profiles!requests_approved_by_fkey(full_name, email)
        `)
        .order('updated_at', { ascending: false })
        .limit(DASHBOARD_ACTIVITY_LIMIT),
      supabase
        .from('returns')
        .select(`
          id,
          received_at,
          notes,
          receiver:profiles!returns_received_by_fkey(full_name, email),
          loans:loans(
            borrower:profiles!loans_user_id_fkey(full_name, email)
          )
        `)
        .order('received_at', { ascending: false })
        .limit(DASHBOARD_ACTIVITY_LIMIT),
      supabase
        .from('maintenance_records')
        .select(`
          id,
          activity,
          responsible,
          maintenance_date,
          maintenance_type,
          created_at,
          items:items(name, code)
        `)
        .order('created_at', { ascending: false })
        .limit(DASHBOARD_ACTIVITY_LIMIT),
    ])

  if (recentRequestsResult.error) {
    throw new Error(recentRequestsResult.error.message)
  }

  if (recentReturnsResult.error) {
    throw new Error(recentReturnsResult.error.message)
  }

  if (recentMaintenanceResult.error) {
    throw new Error(recentMaintenanceResult.error.message)
  }

  const inventorySummary = inventorySummaryResult.data?.[0]
  const totalItems = Number(inventorySummary?.total_items ?? 0)
  const totalStock = Number(inventorySummary?.total_stock ?? 0)
  const totalAvailable = Number(inventorySummary?.total_available ?? 0)
  const totalUnavailable = totalStock - totalAvailable

  const activeLoans = activeLoansResult.count ?? 0
  const partialLoans = partialLoansResult.count ?? 0
  const overdueLoans = overdueLoansResult.count ?? 0
  const returnedLoans = returnedLoansResult.count ?? 0
  const pendingRequests = pendingRequestsCountResult.count ?? 0
  const approvedRequests = approvedRequestsCountResult.count ?? 0

  const lowStockItems = lowStockItemsResult.data ?? []
  const outOfStockItems = outOfStockCountResult.count ?? 0
  const criticalStockItems = criticalStockCountResult.count ?? 0

  const actionableRequests =
    (actionableRequestsResult.data ?? []).map((requestEntry) => {
      const requester = firstOrNull(requestEntry.profiles) as
        | { full_name?: string; email?: string }
        | null

      return {
        id: requestEntry.id,
        requested_at: requestEntry.requested_at,
        status: requestEntry.status,
        purpose: requestEntry.purpose,
        scheduled_return_date: requestEntry.scheduled_return_date,
        requester_name: requester?.full_name ?? 'Sin nombre',
        requester_email: requester?.email ?? '-',
      }
    })

  const recentLoans =
    (recentLoansResult.data ?? []).map((loan) => {
      const borrower = firstOrNull(loan.profiles) as
        | { full_name?: string; email?: string }
        | null

      return {
        id: loan.id,
        status: getEffectiveLoanStatus(
          loan.status,
          loan.expected_return_date,
          currentDate
        ),
        delivery_date: loan.delivery_date,
        expected_return_date: loan.expected_return_date,
        borrower_name: borrower?.full_name ?? 'Sin nombre',
        borrower_email: borrower?.email ?? '-',
      }
    })

  const dueSoonLoans =
    (dueSoonLoansResult.data ?? []).map((loan) => {
      const borrower = firstOrNull(loan.profiles) as
        | { full_name?: string; email?: string }
        | null
      const status = getEffectiveLoanStatus(
        loan.status,
        loan.expected_return_date,
        currentDate
      )

      return {
        id: loan.id,
        status,
        delivery_date: loan.delivery_date,
        expected_return_date: loan.expected_return_date,
        borrower_name: borrower?.full_name ?? 'Sin nombre',
        borrower_email: borrower?.email ?? '-',
        is_overdue: status === 'overdue',
      }
    })

  const recentMovements =
    (movements ?? []).map((movement) => {
      const item = firstOrNull(movement.items) as
        | { id?: string; name?: string; code?: string }
        | null

      const movementUser = firstOrNull(movement.profiles) as
        | { full_name?: string }
        | null

      return {
        id: movement.id,
        type: movement.movement_type,
        quantity: movement.quantity,
        notes: movement.notes,
        created_at: movement.created_at,
        item_name: item?.name ?? '-',
        item_code: item?.code ?? '-',
        user_name: movementUser?.full_name ?? 'Sistema',
      }
    })
  const loanStatusData = [
    { name: 'Activos', value: activeLoans },
    { name: 'Parciales', value: partialLoans },
    { name: 'Vencidos', value: overdueLoans },
    { name: 'Cerrados', value: returnedLoans },
  ]

  const movementTypeMap = new Map<string, number>()

  for (const movement of recentMovements) {
    const formattedType = formatMovementType(movement.type)
    movementTypeMap.set(
      formattedType,
      (movementTypeMap.get(formattedType) ?? 0) + 1
    )
  }

  const movementTypeData = Array.from(movementTypeMap.entries()).map(
    ([name, value]) => ({
      name,
      value,
    })
  )

  const operationalActivities = [
    ...recentMovements.map((movement) => ({
      id: `movement-${movement.id}`,
      date: movement.created_at,
      module: 'Inventario',
      title: formatMovementType(movement.type),
      description: `${movement.item_name} [${movement.item_code}] · Cantidad ${movement.quantity}`,
      actor: movement.user_name,
      href: '/inventario',
      className: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    })),
    ...(recentRequestsResult.data ?? []).map((requestEntry) => {
      const requester = firstOrNull(requestEntry.requester) as
        | { full_name?: string; email?: string }
        | null
      const reviewer = firstOrNull(requestEntry.reviewer) as
        | { full_name?: string; email?: string }
        | null

      return {
        id: `request-${requestEntry.id}`,
        date: requestEntry.approved_at ?? requestEntry.updated_at ?? requestEntry.requested_at,
        module: 'Solicitudes',
        title: formatRequestStatus(requestEntry.status),
        description: requestEntry.purpose ?? `Solicitud de ${requester?.full_name ?? requester?.email ?? 'usuario'}`,
        actor: reviewer?.full_name ?? requester?.full_name ?? requester?.email ?? 'Sistema',
        href: '/dashboard/solicitudes',
        className:
          requestEntry.status === 'rejected'
            ? 'bg-red-50 text-red-700 ring-red-200'
            : requestEntry.status === 'approved'
              ? 'bg-blue-50 text-blue-700 ring-blue-200'
              : requestEntry.status === 'delivered'
                ? 'bg-green-50 text-green-700 ring-green-200'
                : 'bg-amber-50 text-amber-700 ring-amber-200',
      }
    }),
    ...(recentReturnsResult.data ?? []).map((returnEntry) => {
      const receiver = firstOrNull(returnEntry.receiver) as
        | { full_name?: string; email?: string }
        | null
      const loan = firstOrNull(returnEntry.loans) as
        | { borrower?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null }
        | null
      const borrower = firstOrNull(loan?.borrower) as
        | { full_name?: string; email?: string }
        | null

      return {
        id: `return-${returnEntry.id}`,
        date: returnEntry.received_at,
        module: 'Devoluciones',
        title: 'Devolución registrada',
        description: `Préstamo de ${borrower?.full_name ?? borrower?.email ?? 'usuario'}${returnEntry.notes ? ` · ${returnEntry.notes}` : ''}`,
        actor: receiver?.full_name ?? receiver?.email ?? 'Sistema',
        href: '/devoluciones',
        className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      }
    }),
    ...(recentMaintenanceResult.data ?? []).map((record) => {
      const item = firstOrNull(record.items) as
        | { name?: string; code?: string }
        | null

      return {
        id: `maintenance-${record.id}`,
        date: record.created_at ?? record.maintenance_date,
        module: 'Mantenimiento',
        title: formatMaintenanceType(record.maintenance_type),
        description: `${record.activity} · ${item?.name ?? 'Trabajo general'}`,
        actor: record.responsible,
        href: '/mantenimiento',
        className: 'bg-amber-50 text-amber-700 ring-amber-200',
      }
    }),
  ]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0
      const dateB = b.date ? new Date(b.date).getTime() : 0
      return dateB - dateA
    })
    .slice(0, DASHBOARD_ACTIVITY_LIMIT)
  
  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-lg bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard del laboratorio</h1>
              <p className="mt-2 text-slate-600">
                Bienvenido, {profile?.full_name || user.email}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {profile?.email || user.email}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Rol: {profile?.role || 'Sin rol'}
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
              <LinkGoogleButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700" />
              <LogoutButton className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700" />
            </div>
          </div>
        </section>

        <ModuleTabs
          tabs={[
            {
              id: 'resumen',
              label: 'Resumen',
              description: 'Indicadores principales, accesos rápidos y trabajo que requiere atención.',
            },
            {
              id: 'graficas',
              label: 'Gráficas',
              description: 'Análisis visual del periodo seleccionado en reportes.',
            },
            {
              id: 'seguimiento',
              label: 'Seguimiento',
              description: 'Actividad reciente, préstamos, alertas y movimientos operativos.',
            },
            {
              id: 'reportes',
              label: 'Reportes',
              description: 'Filtro de periodo y exportaciones Excel por módulo.',
            },
          ]}
        >
          <div className="space-y-6">
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Resumen general</h2>
            <p className="mt-1 text-sm text-slate-500">
              Inventario, disponibilidad y estado operativo actual.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-slate-500">Ítems registrados</p>
              <p className="mt-2 text-3xl font-bold">{totalItems}</p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-slate-500">Stock total</p>
              <p className="mt-2 text-3xl font-bold">{totalStock}</p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-slate-500">Disponible</p>
              <p className="mt-2 text-3xl font-bold text-green-700">
                {totalAvailable}
              </p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-slate-500">En uso / no disponible</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">
                {totalUnavailable}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-slate-500">Préstamos activos</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{activeLoans}</p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-slate-500">Devoluciones parciales</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{partialLoans}</p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-slate-500">Préstamos vencidos</p>
              <p className="mt-2 text-3xl font-bold text-red-700">{overdueLoans}</p>
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-sm text-slate-500">Préstamos cerrados</p>
              <p className="mt-2 text-3xl font-bold text-green-700">{returnedLoans}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Módulos operativos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Accesos directos para la gestión diaria del laboratorio.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {canSeeLoans && (
              <Link
                href="/prestamos"
                className="block rounded-lg bg-white p-5 shadow transition hover:bg-slate-50"
              >
                <h3 className="font-semibold">Préstamos</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Entregas y gestión de préstamos
                </p>
              </Link>
            )}

            {canSeeReturns && (
              <Link
                href="/devoluciones"
                className="block rounded-lg bg-white p-5 shadow transition hover:bg-slate-50"
              >
                <h3 className="font-semibold">Devoluciones</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Recepción y cierre de préstamos
                </p>
              </Link>
            )}

            {canSeeInventory && (
              <Link
                href="/inventario"
                className="block rounded-lg bg-white p-5 shadow transition hover:bg-slate-50"
              >
                <h3 className="font-semibold">Inventario</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Control de materiales y kardex
                </p>
              </Link>
            )}

            {canSeeInventory && (
              <Link
                href="/mantenimiento"
                className="block rounded-lg bg-white p-5 shadow transition hover:bg-slate-50"
              >
                <h3 className="font-semibold">Mantenimiento</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Registro y control de mantenimientos
                </p>
              </Link>
            )}

            {canSeeLoans && (
              <Link
                href="/dashboard/solicitudes"
                className="block rounded-lg bg-white p-5 shadow transition hover:bg-slate-50"
              >
                <h3 className="font-semibold">Solicitudes</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Revisión y aprobación de solicitudes
                </p>
              </Link>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-lg bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Solicitudes por atender</h2>
              <p className="mt-1 text-sm text-slate-500">
                Solicitudes pendientes de revisión o aprobadas listas para entrega.
              </p>
            </div>
            <Link
              href="/dashboard/solicitudes"
              className="rounded-lg bg-slate-800 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-900"
            >
              Gestionar solicitudes
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-700">Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-amber-800">{pendingRequests}</p>
            </div>
            <div className="rounded-lg bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-700">Aprobadas por entregar</p>
              <p className="mt-1 text-2xl font-bold text-blue-800">{approvedRequests}</p>
            </div>
          </div>

          {actionableRequests.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="hidden grid-cols-[minmax(0,1.2fr)_140px_140px_minmax(0,1fr)] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
                <span>Solicitante</span>
                <span>Fecha</span>
                <span>Estado</span>
                <span>Propósito</span>
              </div>
              <div className="divide-y divide-slate-200">
                {actionableRequests.map((requestEntry) => (
                  <Link
                    key={requestEntry.id}
                    href="/dashboard/solicitudes"
                    className="grid gap-2 px-4 py-3 text-sm transition hover:bg-slate-50 md:grid-cols-[minmax(0,1.2fr)_140px_140px_minmax(0,1fr)] md:items-center md:gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {requestEntry.requester_name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {requestEntry.requester_email}
                      </span>
                    </span>
                    <span className="text-slate-600">
                      {formatDateTime(requestEntry.requested_at)}
                    </span>
                    <span
                      className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${requestStatusBadgeClass(
                        requestEntry.status
                      )}`}
                    >
                      {formatRequestStatus(requestEntry.status)}
                    </span>
                    <span className="truncate text-slate-600">
                      {requestEntry.purpose || '-'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No hay solicitudes pendientes ni aprobadas por entregar.
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-lg bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Vencimientos de préstamos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Préstamos vencidos o con devolución esperada dentro de los próximos 7 días.
              </p>
            </div>
            <Link
              href="/prestamos"
              className="rounded-lg bg-slate-800 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-900"
            >
              Gestionar préstamos
            </Link>
          </div>

          {dueSoonLoans.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="hidden grid-cols-[minmax(0,1.2fr)_150px_140px_120px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
                <span>Usuario</span>
                <span>Entrega</span>
                <span>Devolución</span>
                <span>Estado</span>
              </div>
              <div className="divide-y divide-slate-200">
                {dueSoonLoans.map((loan) => (
                  <Link
                    key={loan.id}
                    href="/prestamos"
                    className={`grid gap-2 px-4 py-3 text-sm transition md:grid-cols-[minmax(0,1.2fr)_150px_140px_120px] md:items-center md:gap-3 ${
                      loan.is_overdue ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {loan.borrower_name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {loan.borrower_email}
                      </span>
                    </span>
                    <span className="text-slate-600">
                      {loan.delivery_date ? formatDateTime(loan.delivery_date) : '-'}
                    </span>
                    <span className="font-medium text-slate-800">
                      {loan.expected_return_date || '-'}
                    </span>
                    <span
                      className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                        loan.status
                      )}`}
                    >
                      {formatLoanStatus(loan.status)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No hay préstamos vencidos ni próximos a vencer en los siguientes 7 días.
            </p>
          )}
        </section>

          </div>

        <section className="space-y-4 rounded-lg bg-white p-5 shadow sm:p-6">
          <div>
            <h2 className="text-xl font-semibold">Análisis visual</h2>
            <p className="mt-1 text-sm text-slate-500">
              Gráficas del periodo seleccionado para préstamos, movimientos y mantenimiento.
            </p>
          </div>

          <DashboardCharts
            loanStatusData={loanStatusData}
            movementTypeData={movementTypeData}
            maintenanceData={maintenanceData}
          />
        </section>



          <div className="space-y-6">
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Seguimiento reciente</h2>
            <p className="mt-1 text-sm text-slate-500">
              Últimos préstamos y alertas de inventario para revisión rápida.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="border-b p-5">
                <h3 className="font-semibold">Préstamos recientes</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[640px] text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Usuario</th>
                      <th className="px-4 py-3 text-left">Entrega</th>
                      <th className="px-4 py-3 text-left">Devolución esperada</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLoans.length > 0 ? (
                      recentLoans.map((loan) => (
                        <tr key={loan.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3">{loan.borrower_name}</td>
                          <td className="px-4 py-3">
                            {loan.delivery_date
                              ? formatDateTime(loan.delivery_date)
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {loan.expected_return_date || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                                loan.status
                              )}`}
                            >
                              {formatLoanStatus(loan.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          No hay préstamos registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="border-b p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold">Alertas de stock</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Ítems activos sin disponibilidad o con 2 unidades disponibles o menos.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">
                      Sin stock: {outOfStockItems}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                      Crítico: {criticalStockItems}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[640px] text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Ítem</th>
                      <th className="px-4 py-3 text-left">Disponible</th>
                      <th className="px-4 py-3 text-left">Alerta</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.length > 0 ? (
                      lowStockItems.map((item) => {
                        const isOutOfStock = item.stock_available === 0

                        return (
                          <tr
                            key={item.id}
                            className={isOutOfStock ? 'border-t bg-red-50 hover:bg-red-100' : 'border-t hover:bg-slate-50'}
                          >
                            <td className="px-4 py-3">{item.code}</td>
                            <td className="px-4 py-3">{item.name}</td>
                            <td
                              className={`px-4 py-3 font-semibold ${
                                isOutOfStock ? 'text-red-700' : 'text-amber-700'
                              }`}
                            >
                              {item.stock_available}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  isOutOfStock
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {isOutOfStock ? 'Sin stock' : 'Stock crítico'}
                              </span>
                            </td>
                            <td className="px-4 py-3">{formatInventoryStatus(item.status)}</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          No hay alertas de stock bajo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Bitácora operativa reciente</h2>
              <p className="mt-1 text-sm text-slate-500">
                Actividad reciente consolidada desde solicitudes, préstamos, devoluciones, inventario y mantenimiento.
              </p>
            </div>
          </div>

          {operationalActivities.length > 0 ? (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {operationalActivities.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.href}
                  className="grid gap-2 px-4 py-3 text-sm transition hover:bg-slate-50 md:grid-cols-[140px_minmax(0,1fr)_180px_140px] md:items-center md:gap-4"
                >
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${activity.className}`}
                  >
                    {activity.module}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">
                      {activity.title}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {activity.description}
                    </span>
                  </span>
                  <span className="truncate text-slate-600">
                    {activity.actor}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(activity.date)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No hay actividad reciente para mostrar.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Movimientos recientes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Últimos movimientos registrados en inventario y préstamos.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-[840px] text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Ítem</th>
                    <th className="px-4 py-3 text-left">Cantidad</th>
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Notas</th>
                  </tr>
                </thead>

                <tbody>
                  {recentMovements.length > 0 ? (
                    recentMovements.map((movement) => (
                      <tr key={movement.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">
                          {formatDateTime(movement.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatMovementType(movement.type)}
                        </td>
                        <td className="px-4 py-3">
                          {movement.item_name} [{movement.item_code}]
                        </td>
                        <td className="px-4 py-3">{movement.quantity}</td>
                        <td className="px-4 py-3">{movement.user_name}</td>
                        <td className="px-4 py-3">{movement.notes || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No hay movimientos recientes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
          </div>

        <section className="rounded-lg bg-white p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Periodo de reporte</h2>
              <p className="mt-1 text-sm text-slate-500">
                Filtra métricas, gráficas y exportaciones del dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div>
                  <label className="mb-1 block text-sm font-medium">Mes</label>
                  <select
                    name="month"
                    defaultValue={selectedMonth}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {formatMonthName(i)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Año</label>
                  <select
                    name="year"
                    defaultValue={selectedYear}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {reportYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                  Filtrar
                </button>
              </form>

              {canSeeReports && (
                <form
                  action="/dashboard/export"
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <input type="hidden" name="month" value={selectedMonth} />
                  <input type="hidden" name="year" value={selectedYear} />

                  <div>
                    <label className="mb-1 block text-sm font-medium">Exportar</label>
                    <select
                      name="module"
                      defaultValue="all"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="all">Todo el reporte</option>
                      <option value="requests">Solicitudes</option>
                      <option value="loans">Préstamos</option>
                      <option value="returns">Devoluciones</option>
                      <option value="maintenance">Mantenimiento</option>
                      <option value="movements">Movimientos</option>
                      <option value="inventory">Inventario completo</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-4 py-2 text-center font-medium text-white transition hover:bg-green-700"
                  >
                    Exportar Excel
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        </ModuleTabs>
      </div>
    </main>
  )

}
