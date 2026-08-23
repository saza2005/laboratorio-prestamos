import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoanForm } from './loan-form'
import { LoansList } from './loans-list'
import { canManageLoans, getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  INVENTORY_CATALOG_LIMIT,
  LOAN_AVAILABLE_UNITS_LIMIT,
  PROFILE_SELECT_LIMIT,
  USER_HISTORY_LIMIT,
} from '@/lib/query-limits'
import { getEcuadorDate, getEffectiveLoanStatus } from '@/lib/loan-status'
import { firstOrNull } from '@/lib/supabase/query-utils'
import { ModuleTabs } from '@/components/module-tabs'
import { PageHeader } from '@/components/page-header'
import { formatUserRole, userRoleBadgeClass } from '@/lib/status-format'

export default async function PrestamosPage() {
  let auth

  try {
    auth = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  const { supabase, profile } = auth
  const currentDate = getEcuadorDate()

  if (!canManageLoans(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

  const [usersResult, itemsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['teacher', 'student'])
      .eq('is_active', true)
      .order('full_name', { ascending: true })
      .limit(PROFILE_SELECT_LIMIT),
    supabase
      .from('items')
      .select(
        'id, code, name, stock_available, item_type, track_individual, category, item_units(asset_code)'
      )
      .eq('status', 'active')
      .gt('stock_available', 0)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
      .order('code', { ascending: true })
      .limit(INVENTORY_CATALOG_LIMIT),
  ])

  if (usersResult.error) {
    throw new Error(usersResult.error.message)
  }

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message)
  }

  const users = usersResult.data ?? []
  const items =
    itemsResult.data?.map((item) => ({
      ...item,
      asset_codes:
        item.item_units
          ?.map((unit) => unit.asset_code)
          .filter((code): code is string => Boolean(code))
          .sort((a, b) => a.localeCompare(b, 'es')) ?? [],
    })) ?? []
  const trackedItemIds = items
    .filter((item) => item.track_individual)
    .map((item) => item.id)

  let availableUnits: Array<{
    id: string
    item_id: string
    asset_code: string | null
    serial_code: string | null
    brand: string | null
    model: string | null
  }> = []

  if (trackedItemIds.length > 0) {
    const itemIdChunks = Array.from(
      { length: Math.ceil(trackedItemIds.length / 50) },
      (_, index) => trackedItemIds.slice(index * 50, index * 50 + 50)
    )

    const unitResults = await Promise.all(
      itemIdChunks.map((chunk) =>
        supabase
          .from('item_units')
          .select('id, item_id, asset_code, serial_code, brand, model')
          .in('item_id', chunk)
          .eq('availability_status', 'available')
          .order('asset_code', { ascending: true })
      )
    )

    const unitsError = unitResults.find((result) => result.error)?.error
    if (unitsError) throw new Error(unitsError.message)

    availableUnits = unitResults
      .flatMap((result) => result.data ?? [])
      .map((unit) => ({
        id: unit.id,
        item_id: unit.item_id,
        asset_code: unit.asset_code,
        serial_code: unit.serial_code,
        brand: unit.brand,
        model: unit.model,
      }))
      .sort((a, b) =>
        (a.asset_code || a.serial_code || a.model || '').localeCompare(
          b.asset_code || b.serial_code || b.model || '',
          'es'
        )
      )
      .slice(0, LOAN_AVAILABLE_UNITS_LIMIT)
  }

  const { data: rawLoans, error: loansError } = await supabase
    .from('loans')
    .select(`
      id,
      delivery_date,
      expected_return_date,
      returned_at,
      status,
      notes,
      profiles:profiles!loans_user_id_fkey(full_name, email),

      loan_items (
        id,
        quantity,
        returned_quantity,
        damaged_quantity,
        missing_quantity,
        item_units:item_units(asset_code, serial_code),
        items (
          id,
          name,
          code
        )
      ),

      loan_groups (
        id,
        group_name,
        leader:profiles(full_name, email),
        loan_group_items (
          id,
          quantity,
          items (
            id,
            name,
            code
          )
        )
      )
    `)
    .order('delivery_date', { ascending: false })
    .limit(USER_HISTORY_LIMIT)

  if (loansError) {
    throw new Error(loansError.message)
  }

  const loans =
    rawLoans?.map((loan) => {
      const borrower = firstOrNull(loan.profiles) as
        | { full_name?: string; email?: string }
        | null

      return {
        id: loan.id,
        delivery_date: loan.delivery_date,
        expected_return_date: loan.expected_return_date,
        returned_at: loan.returned_at,
        status: getEffectiveLoanStatus(
          loan.status,
          loan.expected_return_date
        ),
        notes: loan.notes,
        borrower_name: borrower?.full_name ?? 'Sin nombre',
        borrower_email: borrower?.email ?? '-',

        loan_items:
          loan.loan_items?.map((li) => {
            const item = firstOrNull(li.items) as
              | {
                  id?: string
                  name?: string
                  code?: string
                }
              | null

            const returnedQuantity = li.returned_quantity ?? 0
            const damagedQuantity = li.damaged_quantity ?? 0
            const missingQuantity = li.missing_quantity ?? 0

            const pending =
              li.quantity - returnedQuantity - missingQuantity

            return {
              id: li.id,
              quantity: li.quantity,
              returned_quantity: returnedQuantity,
              damaged_quantity: damagedQuantity,
              missing_quantity: missingQuantity,
              pending,
              item,
              unit: firstOrNull(li.item_units),
            }
          }) ?? [],

        loan_groups:
          loan.loan_groups?.map((group) => {
            const leader = firstOrNull(group.leader) as
              | { full_name?: string; email?: string }
              | null

            return {
              id: group.id,
              group_name: group.group_name,
              leader_name: leader?.full_name ?? 'Sin asignar',
              leader_email: leader?.email ?? '-',
              loan_group_items:
                group.loan_group_items?.map((gi) => {
                  const item = firstOrNull(gi.items) as
                    | {
                        id?: string
                        name?: string
                        code?: string
                      }
                    | null

                  return {
                    id: gi.id,
                    quantity: gi.quantity,
                    item,
                  }
                }) ?? [],
            }
          }) ?? [],
      }
    }) ?? []

  return (
    <main className="app-page">
      <div className="app-container">
        <PageHeader
          eyebrow="Operación"
          title="Gestión de préstamos"
          description="Registra entregas directas y consulta el historial operativo del laboratorio."
          meta={<>
              <span className="text-slate-600">Usuario: {profile?.full_name}</span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${userRoleBadgeClass(
                  profile?.role
                )}`}
              >
                {formatUserRole(profile?.role)}
              </span>
            </>}
          actions={<Link
            href="/dashboard"
            className="button-secondary"
          >
            Volver al dashboard
          </Link>}
        />

        <ModuleTabs
          tabs={[
            {
              id: 'registrar',
              label: 'Registrar préstamo',
              description: 'Crea préstamos directos con uno o varios materiales.',
            },
            {
              id: 'historial',
              label: 'Préstamos registrados',
              description: 'Consulta préstamos recientes, estados, vencimientos y detalles.',
            },
          ]}
        >
          <div className="surface-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Registrar préstamo</h2>
            <LoanForm
              users={users}
              items={items}
              availableUnits={availableUnits}
              minExpectedReturnDate={currentDate}
            />
          </div>

          <section className="surface-card p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Préstamos registrados</h2>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona un préstamo para revisar materiales, usuario, grupos y estado de devolución.
              </p>
            </div>

            <LoansList loans={loans} currentDate={currentDate} />
          </section>
        </ModuleTabs>
      </div>
    </main>
  )
}
