import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  canManageInventory,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'
import { MaintenanceForm } from './maintenance-form'
import { MaintenanceHistory } from './maintenance-history'
import { ADMIN_HISTORY_LIMIT, INVENTORY_CATALOG_LIMIT } from '@/lib/query-limits'
import { ModuleTabs } from '@/components/module-tabs'

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
    .select('id, name, code, category, item_units(asset_code)')
    .eq('item_type', 'equipment')
    .eq('status', 'active')
    .order('name')
    .limit(INVENTORY_CATALOG_LIMIT)

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const maintenanceItems =
    items?.map((item) => ({
      ...item,
      asset_codes:
        item.item_units
          ?.map((unit) => unit.asset_code)
          .filter((code): code is string => Boolean(code)) ?? [],
    })) ?? []

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
    .limit(ADMIN_HISTORY_LIMIT)

  if (recordsError) {
    throw new Error(recordsError.message)
  }

  const normalizedRecords =
    records?.map((record) => ({
      id: record.id,
      activity: record.activity,
      responsible: record.responsible,
      maintenance_date: record.maintenance_date,
      maintenance_type: record.maintenance_type,
      observations: record.observations,
      item: Array.isArray(record.items) ? record.items[0] ?? null : record.items,
    })) ?? []

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

        <ModuleTabs
          tabs={[
            {
              id: 'registrar',
              label: 'Registrar mantenimiento',
              description: 'Registra mantenimiento preventivo, correctivo o trabajo general.',
            },
            {
              id: 'historial',
              label: 'Historial',
              description: 'Consulta mantenimientos recientes y abre el detalle de cada registro.',
            },
          ]}
        >
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Registrar mantenimiento</h2>

            <MaintenanceForm items={maintenanceItems} />
          </div>

          <MaintenanceHistory records={normalizedRecords} limit={100} />
        </ModuleTabs>

      </div>
    </main>
  )
}