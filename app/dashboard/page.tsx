import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/app/logout-button'
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

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function formatMovementType(type: string) {
  switch (type) {
    case 'loan_out':
      return 'Préstamo'
    case 'return_ok':
      return 'Devolución OK'
    case 'return_damaged':
      return 'Devuelto dañado'
    case 'return_missing':
      return 'Reportado faltante'
    case 'adjustment_up':
      return 'Ajuste positivo'
    case 'adjustment_down':
      return 'Ajuste negativo'
    default:
      return type
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'partial_return':
      return 'bg-amber-100 text-amber-700'
    case 'returned':
      return 'bg-green-100 text-green-700'
    case 'overdue':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
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
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Dashboard del laboratorio
            </h1>

            <p className="text-slate-600">
              Bienvenido, {profile?.full_name || user.email}
            </p>
          </div>

          <LogoutButton className="w-full rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 sm:w-auto" />
        </div>
        <div className="mb-6 rounded-2xl bg-white shadow p-4">
          <form className="flex flex-col gap-4 md:flex-row md:items-end">
            <div>
              <label className="text-sm font-medium block mb-1">Mes</label>
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
              <label className="text-sm font-medium block mb-1">Año</label>
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
              className="w-full rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 transition md:w-auto"
            >
              Filtrar
            </button>
          </form>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <Link
            href={`/dashboard/export?month=${selectedMonth}&year=${selectedYear}`}
            className="text-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 sm:text-left"
          >
            Exportar Excel
          </Link>
        </div>

        <div className="mb-6 rounded-2xl bg-white shadow p-6">
          <p>
            <strong>Correo:</strong> {profile?.email || user.email}
          </p>
          <p>
            <strong>Rol:</strong> {profile?.role || 'Sin rol'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <div className="rounded-2xl bg-white shadow p-6">
            <p className="text-sm text-slate-500 mb-1">Ítems registrados</p>
            <p className="text-3xl font-bold">{totalItems}</p>
          </div>

          <div className="rounded-2xl bg-white shadow p-6">
            <p className="text-sm text-slate-500 mb-1">Stock total</p>
            <p className="text-3xl font-bold">{totalStock}</p>
          </div>

          <div className="rounded-2xl bg-white shadow p-6">
            <p className="text-sm text-slate-500 mb-1">Disponible</p>
            <p className="text-3xl font-bold text-green-700">
              {totalAvailable}
            </p>
          </div>

          <div className="rounded-2xl bg-white shadow p-6">
            <p className="text-sm text-slate-500 mb-1">En uso / no disponible</p>
            <p className="text-3xl font-bold text-amber-700">
              {totalUnavailable}
            </p>
          </div>
        </div>
        <DashboardCharts
          loanStatusData={loanStatusData}
          movementTypeData={movementTypeData}
          maintenanceData={maintenanceData}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <div className="rounded-2xl bg-white shadow p-6">
            <p className="text-sm text-slate-500 mb-1">Préstamos activos</p>
            <p className="text-3xl font-bold text-blue-700">{activeLoans}</p>
          </div>

          <div className="rounded-2xl bg-white shadow p-6">
            <p className="text-sm text-slate-500 mb-1">Devoluciones parciales</p>
            <p className="text-3xl font-bold text-amber-700">{partialLoans}</p>
          </div>

          <div className="rounded-2xl bg-white shadow p-6">
            <p className="text-sm text-slate-500 mb-1">Préstamos vencidos</p>
            <p className="text-3xl font-bold text-red-700">{overdueLoans}</p>
          </div>

          <div className="rounded-2xl bg-white shadow p-6">
            <p className="text-sm text-slate-500 mb-1">Préstamos cerrados</p>
            <p className="text-3xl font-bold text-green-700">{returnedLoans}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {canSeeLoans && (
            <Link
              href="/prestamos"
              className="block rounded-2xl bg-white shadow p-6 hover:bg-slate-50 transition"
            >
              <h2 className="font-semibold mb-2">Préstamos</h2>
              <p className="text-sm text-slate-600">
                Entregas y gestión de préstamos
              </p>
            </Link>
          )}

          {canSeeReturns && (
            <Link
              href="/devoluciones"
              className="block rounded-2xl bg-white shadow p-6 hover:bg-slate-50 transition"
            >
              <h2 className="font-semibold mb-2">Devoluciones</h2>
              <p className="text-sm text-slate-600">
                Recepción y cierre de préstamos
              </p>
            </Link>
          )}

          {canSeeInventory && (
            <Link
              href="/inventario"
              className="block rounded-2xl bg-white shadow p-6 hover:bg-slate-50 transition"
            >
              <h2 className="font-semibold mb-2">Inventario</h2>
              <p className="text-sm text-slate-600">
                Control de materiales y kardex
              </p>
            </Link>
          )}
          {canSeeInventory && (
            <Link
              href="/mantenimiento"
              className="block rounded-2xl bg-white shadow p-6 hover:bg-slate-50 transition"
            >
              <h2 className="font-semibold mb-2">Mantenimiento</h2>
              <p className="text-sm text-slate-600">
                Registro y control de mantenimientos
              </p>
            </Link>
          )}
          {canSeeLoans && (
            <Link
              href="/dashboard/solicitudes"
              className="block rounded-2xl bg-white shadow p-6 hover:bg-slate-50 transition"
            >
              <h2 className="font-semibold mb-2">Solicitudes</h2>
              <p className="text-sm text-slate-600">
                Revisión y aprobación de solicitudes
              </p>
            </Link>
          )}

          {canSeeReports && (
            <div className="rounded-2xl bg-white shadow p-6">
              <h2 className="font-semibold mb-2">Reportes</h2>
              <p className="text-sm text-slate-600">
                Base preparada para estadísticas y auditoría
              </p>
            </div>
          )}
        </div>

        <div className="grid xl:grid-cols-2 gap-8 mb-8">
          <div className="rounded-2xl bg-white shadow overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Préstamos recientes</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[640px] text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3">Usuario</th>
                    <th className="text-left px-4 py-3">Entrega</th>
                    <th className="text-left px-4 py-3">Devolución esperada</th>
                    <th className="text-left px-4 py-3">Estado</th>
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

          <div className="rounded-2xl bg-white shadow overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Ítems con stock bajo</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[560px] text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3">Código</th>
                    <th className="text-left px-4 py-3">Ítem</th>
                    <th className="text-left px-4 py-3">Disponible</th>
                    <th className="text-left px-4 py-3">Estado</th>
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

        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Movimientos recientes</h2>
          </div>

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
                    <tr
                      key={movement.id}
                      className="border-t hover:bg-slate-50"
                    >
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
      </div>
    </main>
  )
}
