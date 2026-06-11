import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ItemForm } from './item-form'
import { MovementsTable } from './movements-table'
import { canManageInventory, getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'

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
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    throw new Error(error.message)
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

        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Items registrados</h2>
          </div>

          <div className="divide-y md:hidden">
            {items && items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="space-y-2 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-slate-500">{item.code}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                      {item.status}
                    </span>
                  </div>
                  <p><span className="font-medium">Categoría:</span> {item.category || '-'}</p>
                  <p><span className="font-medium">Tipo:</span> {item.item_type}</p>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-center">
                    <p><span className="block text-xs text-slate-500">Stock total</span>{item.stock_total}</p>
                    <p><span className="block text-xs text-slate-500">Disponible</span>{item.stock_available}</p>
                  </div>
                  <p><span className="font-medium">Seguimiento:</span> {item.track_individual ? 'Sí' : 'No'}</p>
                  <p><span className="font-medium">Ubicación:</span> {item.location || '-'}</p>
                </div>
              ))
            ) : (
              <p className="p-6 text-center text-slate-500">No hay ítems registrados todavía.</p>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1080px] text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Categoría</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Seguimiento</th>
                  <th className="text-left px-4 py-3">Stock total</th>
                  <th className="text-left px-4 py-3">Disponible</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {items && items.length > 0 ? (
                  items.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3">{item.code}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.category || '-'}</td>
                      <td className="px-4 py-3">{item.item_type}</td>
                      <td className="px-4 py-3">
                        {item.track_individual ? 'Sí' : 'No'}
                      </td>
                      <td className="px-4 py-3">{item.stock_total}</td>
                      <td className="px-4 py-3">{item.stock_available}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">{item.location || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      No hay items registrados todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <MovementsTable data={normalizedMovements} limit={100} />
      </div>
    </main>
  )
}