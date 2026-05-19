import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createItem } from './actions'
import { MovementsTable } from './movements-table'
import { canManageInventory } from '@/lib/supabase/auth/roles'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function InventarioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
    if (!canManageInventory(profile?.role)) {
      redirect('/dashboard')
    }

  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

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
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Inventario</h1>
          <p className="text-slate-600">
            Usuario: {profile?.full_name} | Rol: {profile?.role}
          </p>
        </div>

        <div className="mb-6">
          <a
            href="/dashboard"
            className="inline-block rounded-lg bg-slate-800 text-white px-4 py-2 hover:bg-slate-900 transition"
          >
            Volver al dashboard
          </a>
        </div>

        <div className="mb-8 rounded-2xl bg-white shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Agregar nuevo item</h2>

          <form action={createItem} className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Código</label>
              <input
                name="code"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="BAN-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                name="name"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Bandeja"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Descripción
              </label>
              <input
                name="description"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Descripción del item"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Categoría
              </label>
              <input
                name="category"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Materiales / Equipos / Herramientas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                name="item_type"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Seleccione</option>
                <option value="consumable">Consumible</option>
                <option value="equipment">Equipo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <select
                name="status"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Seleccione</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Stock total
              </label>
              <input
                name="stock_total"
                type="number"
                min="0"
                defaultValue="0"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Stock disponible
              </label>
              <input
                name="stock_available"
                type="number"
                min="0"
                defaultValue="0"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Ubicación
              </label>
              <input
                name="location"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Estante A"
              />
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                id="track_individual"
                name="track_individual"
                type="checkbox"
                className="h-4 w-4"
              />
              <label htmlFor="track_individual" className="text-sm font-medium">
                Seguimiento individual
              </label>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 text-white px-5 py-2.5 font-medium hover:bg-blue-700 transition"
              >
                Guardar item
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Items registrados</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
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
        <MovementsTable data={normalizedMovements} />
      </div>
    </main>
  )
}