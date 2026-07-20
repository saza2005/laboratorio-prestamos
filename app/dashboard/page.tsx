import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/logout-button'
import { LinkGoogleButton } from '@/app/auth/link-google-button'
import { DashboardCharts } from './dashboard-charts'
import {
  canSeeInventoryModule,
  canSeeLoansModule,
  canSeeReturnsModule,
  canSeeReportsModule,
} from '@/lib/supabase/auth/roles'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { formatDateTime, formatMonthName } from '@/lib/format-date'
import { parseReportPeriod } from '@/lib/report-period'
import { getEcuadorDate, getEffectiveLoanStatus } from '@/lib/loan-status'
import { formatMovementType, loanStatusBadgeClass as statusBadgeClass } from '@/lib/status-format'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

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

  const period = parseReportPeriod(params.month, params.year, new Date())

  if (!period) {
    redirect('/dashboard')
  }

  const selectedMonth = period.month
  const selectedYear = period.year

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

  const [inventorySummaryResult, lowStockItemsResult] = await Promise.all([
    supabase.rpc('get_dashboard_inventory_summary'),
    supabase
      .from('items')
      .select('id, code, name, stock_available, status')
      .eq('status', 'active')
      .lte('stock_available', 2)
      .order('stock_available', { ascending: true })
      .limit(6),
  ])

  if (inventorySummaryResult.error) {
    throw new Error(inventorySummaryResult.error.message)
  }

  if (lowStockItemsResult.error) {
    throw new Error(lowStockItemsResult.error.message)
  }

  const currentDate = getEcuadorDate()
  const [
    activeLoansResult,
    partialLoansResult,
    overdueLoansResult,
    returnedLoansResult,
    recentLoansResult,
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
      .limit(6),
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
    .limit(8)

  if (movementsError) {
    throw new Error(movementsError.message)
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

  const lowStockItems = lowStockItemsResult.data ?? []

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
                    {[2024, 2025, 2026, 2027].map((year) => (
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
                <Link
                  href={`/dashboard/export?month=${selectedMonth}&year=${selectedYear}`}
                  className="rounded-lg bg-green-600 px-4 py-2 text-center font-medium text-white transition hover:bg-green-700"
                >
                  Exportar Excel
                </Link>
              )}
            </div>
          </div>
        </section>

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
                              {loan.status === 'overdue' ? 'Vencido' : loan.status}
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
                <h3 className="font-semibold">Ítems con stock bajo</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[560px] text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Ítem</th>
                      <th className="px-4 py-3 text-left">Disponible</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.length > 0 ? (
                      lowStockItems.map((item) => (
                        <tr key={item.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3">{item.code}</td>
                          <td className="px-4 py-3">{item.name}</td>
                          <td className="px-4 py-3 font-semibold text-amber-700">
                            {item.stock_available}
                          </td>
                          <td className="px-4 py-3">{item.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
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
    </main>
  )

}
