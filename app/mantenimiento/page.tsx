import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageInventory } from '@/lib/supabase/auth/roles'
import { createMaintenance } from './actions'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export default async function MantenimientoPage() {
  const { supabase, profile } = await getAuthProfile()

  if (!canManageInventory(profile.role)) {
    redirect('/dashboard')
  }

  const { data: items } = await supabase
    .from('items')
    .select('id, name, code')
    .order('name')

  const { data: records } = await supabase
    .from('maintenance_records')
    .select(`
      id,
      activity,
      responsible,
      maintenance_date,
      maintenance_type,
      observations,
      items:items(name, code)
    `)
    .order('maintenance_date', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        <h1 className="text-3xl font-bold">Mantenimiento de equipos</h1>

        {/* FORM */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Registrar mantenimiento</h2>

          <form action={createMaintenance} className="grid md:grid-cols-2 gap-4">

            <select name="item_id" required className="border p-2 rounded">
              <option value="">Seleccione equipo</option>
              {items?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} [{item.code}]
                </option>
              ))}
            </select>

            <input
              name="activity"
              placeholder="Actividad realizada"
              required
              className="border p-2 rounded"
            />

            <input
              name="responsible"
              placeholder="Responsable(s)"
              required
              className="border p-2 rounded"
            />

            <input
              name="maintenance_date"
              type="date"
              required
              className="border p-2 rounded"
            />

            <select name="maintenance_type" required className="border p-2 rounded">
              <option value="">Tipo</option>
              <option value="preventive">Preventivo</option>
              <option value="corrective">Correctivo</option>
            </select>

            <textarea
              name="observations"
              placeholder="Observaciones"
              className="border p-2 rounded md:col-span-2"
            />

            <button className="bg-blue-600 text-white px-4 py-2 rounded md:col-span-2">
              Guardar
            </button>
          </form>
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Historial</h2>

          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Actividad</th>
                <th>Responsable</th>
                <th>Fecha</th>
                <th>Tipo</th>
              </tr>
            </thead>

            <tbody>
              {records?.map((r) => {
                const item = firstOrNull(r.items)

                return (
                  <tr key={r.id} className="border-t">
                    <td>{item?.name ?? '-'}</td>
                    <td>{r.activity}</td>
                    <td>{r.responsible}</td>
                    <td>{r.maintenance_date}</td>
                    <td>{r.maintenance_type}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}