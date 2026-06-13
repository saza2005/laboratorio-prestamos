import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  canManageInventory,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'
import { MaintenanceForm } from './maintenance-form'
import { INVENTORY_CATALOG_LIMIT } from '@/lib/query-limits'

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

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, name, code, category')
    .eq('item_type', 'equipment')
    .eq('status', 'active')
    .order('name')
    .limit(INVENTORY_CATALOG_LIMIT)

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const { data: records, error: recordsError } = await supabase
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

  if (recordsError) {
    throw new Error(recordsError.message)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold">Mantenimiento de equipos</h1>

          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-800 px-4 py-2 text-center text-white transition hover:bg-slate-900"
          >
            Volver al dashboard
          </Link>
        </div>

        {/* FORM */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Registrar mantenimiento</h2>

          <MaintenanceForm items={items ?? []} />
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Historial</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mostrando los últimos 100 mantenimientos registrados
            </p>
          </div>

          <div className="divide-y md:hidden">
            {records && records.length > 0 ? (
              records.map((record) => {
                const item = firstOrNull(record.items)

                return (
                  <div key={record.id} className="space-y-2 p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item?.name ?? 'Trabajo general'}</p>
                        <p className="text-slate-500">{record.maintenance_date}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                        {formatMaintenanceType(record.maintenance_type)}
                      </span>
                    </div>
                    <p><span className="font-medium">Actividad:</span> {record.activity}</p>
                    <p><span className="font-medium">Responsable:</span> {record.responsible}</p>
                    {record.observations && (
                      <p className="text-slate-600"><span className="font-medium">Observaciones:</span> {record.observations}</p>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="p-6 text-center text-slate-500">No hay mantenimientos registrados.</p>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[760px] text-sm">
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
                        <td className="px-4 py-3">{item?.name ?? 'Trabajo general'}</td>
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