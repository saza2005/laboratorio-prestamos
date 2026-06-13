import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ItemForm } from './item-form'
import { MovementsTable } from './movements-table'
import { InventoryList } from './inventory-list'
import { InventoryUnitsList } from './inventory-units-list'
import { canManageInventory, getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { INVENTORY_CATALOG_LIMIT } from '@/lib/query-limits'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

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
      location
    `)
    .order('created_at', { ascending: false })
    .limit(INVENTORY_CATALOG_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

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
    .limit(100)

  if (movementsError) {
    throw new Error(movementsError.message)
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Inventario</h1>
          <p className="text-slate-600">
            Usuario: {profile?.full_name} | Rol: {profile?.role}
          </p>
        </div>

        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-slate-800 text-white px-4 py-2 hover:bg-slate-900 transition"
          >
            Volver al dashboard
          </Link>
        </div>

        <div className="mb-8 rounded-2xl bg-white shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Agregar nuevo item</h2>

          <ItemForm />
        </div>

        <InventoryList items={items ?? []} />
        <InventoryUnitsList units={units} />
        <MovementsTable data={normalizedMovements} limit={100} />
      </div>
    </main>
  )
}