import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ItemForm } from './item-form'
import { MovementsTable } from './movements-table'
import { InventoryList } from './inventory-list'
import { InventoryUnitsList } from './inventory-units-list'
import { canManageInventory, getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { ADMIN_HISTORY_LIMIT, INVENTORY_CATALOG_LIMIT, INVENTORY_ITEM_HISTORY_LIMIT, INVENTORY_UNIT_MAINTENANCE_LIMIT } from '@/lib/query-limits'
import { firstOrNull } from '@/lib/supabase/query-utils'
import { ModuleTabs } from '@/components/module-tabs'
import { formatLoanStatus, formatUserRole, userRoleBadgeClass } from '@/lib/status-format'


export default async function InventarioPage() {
  let auth

  try {
    auth = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  const { supabase, profile } = auth

  if (!canManageInventory(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

  const { data: items, error } = await supabase
    .from('items')
    .select(`
      id,
      code,
      name,
      category,
      item_type,
      track_individual,
      stock_total,
      stock_available,
      status,
      location,
      item_units(asset_code, condition, availability_status)
    `)
    .order('created_at', { ascending: false })
    .limit(INVENTORY_CATALOG_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  const inventoryItems =
    items?.map((item) => ({
      ...item,
      asset_codes:
        item.item_units
          ?.map((unit) => unit.asset_code)
          .filter((code): code is string => Boolean(code)) ?? [],
      unit_conditions:
        item.item_units
          ?.map((unit) => unit.condition)
          .filter((condition): condition is string => Boolean(condition)) ?? [],
      unit_availability_statuses:
        item.item_units
          ?.map((unit) => unit.availability_status)
          .filter((status): status is string => Boolean(status)) ?? [],
    })) ?? []

  const unitSelect = `
    id,
    asset_code,
    old_code,
    serial_code,
    model,
    brand,
    condition,
    availability_status,
    entry_date,
    assignment_date,
    items:items(name, code)
  `

  const [firstUnitsPage, secondUnitsPage] = await Promise.all([
    supabase
      .from('item_units')
      .select(unitSelect)
      .order('asset_code', { ascending: true })
      .range(0, 999),
    supabase
      .from('item_units')
      .select(unitSelect)
      .order('asset_code', { ascending: true })
      .range(1000, 1999),
  ])

  if (firstUnitsPage.error) {
    throw new Error(firstUnitsPage.error.message)
  }

  if (secondUnitsPage.error) {
    throw new Error(secondUnitsPage.error.message)
  }

  const units = [...(firstUnitsPage.data ?? []), ...(secondUnitsPage.data ?? [])]
    .map((unit) => {
      const item = firstOrNull(unit.items) as
        | { name?: string; code?: string }
        | null

      return {
        id: unit.id,
        asset_code: unit.asset_code,
        old_code: unit.old_code,
        serial_code: unit.serial_code,
        model: unit.model,
        brand: unit.brand,
        condition: unit.condition,
        availability_status: unit.availability_status,
        entry_date: unit.entry_date,
        assignment_date: unit.assignment_date,
        item_name: item?.name ?? 'Sin equipo',
        item_code: item?.code ?? '-',
      }
    })

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
    .limit(ADMIN_HISTORY_LIMIT)

  if (movementsError) {
    throw new Error(movementsError.message)
  }

  const [
    loanHistoryResult,
    returnHistoryResult,
    maintenanceHistoryResult,
    unitMovementsResult,
  ] = await Promise.all([
      supabase
        .from('loan_items')
        .select(`
          id,
          item_id,
          quantity,
          returned_quantity,
          damaged_quantity,
          missing_quantity,
          created_at,
          loans:loans(
            id,
            delivery_date,
            status,
            borrower:profiles!loans_user_id_fkey(full_name, email)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(INVENTORY_ITEM_HISTORY_LIMIT),
      supabase
        .from('return_items')
        .select(`
          id,
          quantity_ok,
          quantity_damaged,
          quantity_missing,
          notes,
          created_at,
          loan_items:loan_items(item_id),
          returns:returns(
            received_at,
            receiver:profiles!returns_received_by_fkey(full_name, email)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(INVENTORY_ITEM_HISTORY_LIMIT),
      supabase
        .from('maintenance_records')
        .select(`
          id,
          item_id,
          item_unit_id,
          activity,
          responsible,
          maintenance_date,
          maintenance_type,
          observations
        `)
        .order('maintenance_date', { ascending: false })
        .limit(INVENTORY_UNIT_MAINTENANCE_LIMIT),
      supabase
        .from('inventory_movements')
        .select(`
          id,
          movement_type,
          quantity,
          reference_id,
          notes,
          created_at,
          profiles:profiles!inventory_movements_created_by_fkey(full_name)
        `)
        .eq('reference_table', 'item_units')
        .order('created_at', { ascending: false })
        .limit(INVENTORY_UNIT_MAINTENANCE_LIMIT),
    ])

  if (loanHistoryResult.error) {
    throw new Error(loanHistoryResult.error.message)
  }

  if (returnHistoryResult.error) {
    throw new Error(returnHistoryResult.error.message)
  }

  if (maintenanceHistoryResult.error) {
    throw new Error(maintenanceHistoryResult.error.message)
  }

  if (unitMovementsResult.error) {
    throw new Error(unitMovementsResult.error.message)
  }

  const normalizedMovements =
    movements?.map((movement) => {
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
    }) ?? []

  const historyByItem = new Map<
    string,
    Array<{
      id: string
      date: string | null
      type: string
      title: string
      description: string
      quantity?: number
      user?: string
    }>
  >()

  function addItemHistory(
    itemId: string | null | undefined,
    entry: {
      id: string
      date: string | null
      type: string
      title: string
      description: string
      quantity?: number
      user?: string
    }
  ) {
    if (!itemId) return
    const entries = historyByItem.get(itemId) ?? []
    entries.push(entry)
    historyByItem.set(itemId, entries)
  }

  movements?.forEach((movement) => {
    const item = firstOrNull(movement.items) as { id?: string } | null
    const movementUser = firstOrNull(movement.profiles) as
      | { full_name?: string }
      | null

    addItemHistory(item?.id, {
      id: movement.id,
      date: movement.created_at,
      type: movement.movement_type,
      title: 'Movimiento de inventario',
      description: movement.notes ?? 'Movimiento registrado en inventario',
      quantity: movement.quantity,
      user: movementUser?.full_name ?? 'Sistema',
    })
  })

  loanHistoryResult.data?.forEach((loanItem) => {
    const loan = firstOrNull(loanItem.loans) as
      | {
          delivery_date?: string | null
          status?: string | null
          borrower?:
            | { full_name?: string; email?: string }
            | { full_name?: string; email?: string }[]
            | null
        }
      | null
    const borrower = firstOrNull(loan?.borrower) as
      | { full_name?: string; email?: string }
      | null
    const pending =
      loanItem.quantity -
      (loanItem.returned_quantity ?? 0) -
      (loanItem.missing_quantity ?? 0)

    addItemHistory(loanItem.item_id, {
      id: loanItem.id,
      date: loan?.delivery_date ?? loanItem.created_at,
      type: 'loan',
      title: 'Préstamo',
      description: `Estado: ${formatLoanStatus(loan?.status)} · Pendiente: ${Math.max(0, pending)}`,
      quantity: loanItem.quantity,
      user: borrower?.full_name ?? borrower?.email ?? 'Sin usuario',
    })
  })

  returnHistoryResult.data?.forEach((returnItem) => {
    const loanItem = firstOrNull(returnItem.loan_items) as
      | { item_id?: string | null }
      | null
    const returnData = firstOrNull(returnItem.returns) as
      | {
          received_at?: string | null
          receiver?:
            | { full_name?: string; email?: string }
            | { full_name?: string; email?: string }[]
            | null
        }
      | null
    const receiver = firstOrNull(returnData?.receiver) as
      | { full_name?: string; email?: string }
      | null
    const totalReturned =
      (returnItem.quantity_ok ?? 0) +
      (returnItem.quantity_damaged ?? 0) +
      (returnItem.quantity_missing ?? 0)

    addItemHistory(loanItem?.item_id, {
      id: returnItem.id,
      date: returnData?.received_at ?? returnItem.created_at,
      type: 'return',
      title: 'Devolución',
      description: `OK: ${returnItem.quantity_ok} · Dañado: ${returnItem.quantity_damaged} · Faltante: ${returnItem.quantity_missing}`,
      quantity: totalReturned,
      user: receiver?.full_name ?? receiver?.email ?? 'Sin receptor',
    })
  })

  maintenanceHistoryResult.data?.forEach((record) => {
    addItemHistory(record.item_id, {
      id: record.id,
      date: record.maintenance_date,
      type: `maintenance_${record.maintenance_type}`,
      title: 'Mantenimiento',
      description: `${record.activity}${record.observations ? ` · ${record.observations}` : ''}`,
      user: record.responsible,
    })
  })

  const maintenanceByUnit = new Map<
    string,
    Array<{
      id: string
      date: string | null
      activity: string
      responsible: string
      maintenance_type: string
      observations: string | null
    }>
  >()

  maintenanceHistoryResult.data?.forEach((record) => {
    if (!record.item_unit_id) return
    const entries = maintenanceByUnit.get(record.item_unit_id) ?? []
    entries.push({
      id: record.id,
      date: record.maintenance_date,
      activity: record.activity,
      responsible: record.responsible,
      maintenance_type: record.maintenance_type,
      observations: record.observations,
    })
    maintenanceByUnit.set(record.item_unit_id, entries)
  })

  const unitMovementsByUnit = new Map<
    string,
    Array<{
      id: string
      date: string | null
      movement_type: string
      quantity: number
      notes: string | null
      user: string
    }>
  >()

  unitMovementsResult.data?.forEach((movement) => {
    if (!movement.reference_id) return
    const movementUser = firstOrNull(movement.profiles) as
      | { full_name?: string }
      | null
    const entries = unitMovementsByUnit.get(movement.reference_id) ?? []
    entries.push({
      id: movement.id,
      date: movement.created_at,
      movement_type: movement.movement_type,
      quantity: movement.quantity,
      notes: movement.notes,
      user: movementUser?.full_name ?? 'Sistema',
    })
    unitMovementsByUnit.set(movement.reference_id, entries)
  })

  const unitsWithMaintenance = units.map((unit) => ({
    ...unit,
    maintenance_records: (maintenanceByUnit.get(unit.id) ?? [])
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 5),
    unit_status_events: (unitMovementsByUnit.get(unit.id) ?? [])
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 5),
  }))
  const itemHistories = Object.fromEntries(
    Array.from(historyByItem.entries()).map(([itemId, entries]) => [
      itemId,
      entries
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0
          const dateB = b.date ? new Date(b.date).getTime() : 0
          return dateB - dateA
        })
        .slice(0, 12),
    ])
  )

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Inventario</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">Usuario: {profile?.full_name}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${userRoleBadgeClass(
                  profile?.role
                )}`}
              >
                {formatUserRole(profile?.role)}
              </span>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-center text-white transition hover:bg-slate-900"
          >
            Volver al dashboard
          </Link>
        </div>

        <ModuleTabs
          tabs={[
            {
              id: 'items',
              label: 'Ítems',
              description: 'Consulta el inventario general, stock, códigos y detalles por ítem.',
            },
            {
              id: 'unidades',
              label: 'Unidades',
              description: 'Revisa equipos con seguimiento individual y sus códigos patrimoniales.',
            },
            {
              id: 'movimientos',
              label: 'Movimientos',
              description: 'Consulta movimientos recientes de inventario.',
            },
            {
              id: 'nuevo',
              label: 'Agregar ítem',
              description: 'Registra manualmente un nuevo material o equipo.',
            },
          ]}
        >
          <InventoryList items={inventoryItems} histories={itemHistories} />

          <InventoryUnitsList units={unitsWithMaintenance} />

          <MovementsTable data={normalizedMovements} limit={100} />

          <div className="rounded-2xl bg-white shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Agregar nuevo item</h2>

            <ItemForm />
          </div>
        </ModuleTabs>
      </div>
    </main>
  )
}
