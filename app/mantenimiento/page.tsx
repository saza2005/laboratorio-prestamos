import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  canManageInventory,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'
import { createMaintenance } from './actions'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatMaintenanceType(type: string) {
  return type === 'preventive' ? 'Preventivo' : 'Correctivo'
}

export default async function MantenimientoPage() {
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
    .limit(100)

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
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Historial</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mostrando los últimos 100 mantenimientos registrados
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Equipo</th>
                  <th className="px-4 py-3 text-left">Actividad</th>
                  <th className="px-4 py-3 text-left">Responsable</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                </tr>
              </thead>

              <tbody>
                {records && records.length > 0 ? (
                  records.map((r) => {
                    const item = firstOrNull(r.items)

                    return (
                      <tr key={r.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">{item?.name ?? '-'}</td>
                        <td className="px-4 py-3">{r.activity}</td>
                        <td className="px-4 py-3">{r.responsible}</td>
                        <td className="px-4 py-3">{r.maintenance_date}</td>
                        <td className="px-4 py-3">{formatMaintenanceType(r.maintenance_type)}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No hay mantenimientos registrados.
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