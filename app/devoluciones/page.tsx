import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReturnForm } from '@/app/devoluciones/return-form'
import { PendingReturnsList } from './pending-returns-list'
import { ReturnsHistory } from './returns-history'
import { canManageReturns, getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { ADMIN_HISTORY_LIMIT, PROFILE_SELECT_LIMIT } from '@/lib/query-limits'
import { firstOrNull } from '@/lib/supabase/query-utils'
import { ModuleTabs } from '@/components/module-tabs'
import { PageHeader } from '@/components/page-header'
import { formatUserRole, userRoleBadgeClass } from '@/lib/status-format'

const RETURN_HISTORY_ITEM_FETCH_LIMIT = ADMIN_HISTORY_LIMIT * 5

export default async function DevolucionesPage() {
  let auth

  try {
    auth = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  const { supabase, profile } = auth

  if (!canManageReturns(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

  const { data: loanItems, error } = await supabase
    .from('loan_items')
    .select(`
      id,
      quantity,
      returned_quantity,
      damaged_quantity,
      missing_quantity,
      item_id,
      item_unit_id,
      loan_id,
      item_units:item_units(asset_code, serial_code),
      items:items(id, name, code),
      loans:loans!inner(
        id,
        status,
        user_id,
        delivery_date,
        expected_return_date,
        loan_groups (
          id,
          group_name,
          leader:profiles(full_name, email),
          loan_group_items (
            id,
            item_id,
            quantity,
            items (
              id,
              name,
              code
            )
          )
        )
      ),
      loan_user:loans!inner(
        user_id,
        profiles:profiles!loans_user_id_fkey(full_name, email)
      )
    `)
    .in('loans.status', ['active', 'partial_return', 'overdue'])
    .order('created_at', { ascending: false })
    .limit(PROFILE_SELECT_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  const { data: returnHistory, error: returnHistoryError } = await supabase
    .from('return_items')
    .select(`
      id,
      quantity_ok,
      quantity_damaged,
      quantity_missing,
      notes,
      return_id,
      loan_item_id,
      returns:returns(
        id,
        loan_id,
        received_by,
        notes,
        created_at,
        receiver_profile:profiles!returns_received_by_fkey(full_name, email)
      ),
      loan_items:loan_items(
        id,
        quantity,
        returned_quantity,
        missing_quantity,
        item_id,
        item_unit_id,
        loan_id,
        item_units:item_units(asset_code, serial_code),
        items:items(id, name, code),
        loans:loans(
          id,
          user_id,
          status,
          borrower_profile:profiles!loans_user_id_fkey(full_name, email)
        )
      )
    `)
    .order('created_at', { ascending: false, referencedTable: 'returns' })
    .limit(RETURN_HISTORY_ITEM_FETCH_LIMIT)
  if (returnHistoryError) {
    throw new Error(returnHistoryError.message)
  }

  const activeLoanItems =
    loanItems?.filter((li) => {
      const loanData = firstOrNull(li.loans) as { status?: string } | null

      const returnedQuantity = li.returned_quantity ?? 0
      const missingQuantity = li.missing_quantity ?? 0

      const pendiente = li.quantity - returnedQuantity - missingQuantity

      const isReturnableLoan =
        loanData?.status === 'active' ||
        loanData?.status === 'partial_return' ||
        loanData?.status === 'overdue'

      return pendiente > 0 && isReturnableLoan
    }) ?? []
  const normalizedActiveLoanItems = activeLoanItems.map((li) => {
    const normalizedLoanUser =
      Array.isArray(li.loan_user) ? li.loan_user[0] ?? null : li.loan_user
    const normalizedLoan = Array.isArray(li.loans) ? li.loans[0] ?? null : li.loans

    return {
      ...li,
      items: Array.isArray(li.items) ? li.items[0] ?? null : li.items,
      item_units: Array.isArray(li.item_units)
        ? li.item_units[0] ?? null
        : li.item_units,
      loans: normalizedLoan
        ? {
            ...normalizedLoan,
            loan_groups:
              normalizedLoan.loan_groups?.map((group) => ({
                ...group,
                leader: firstOrNull(group.leader),
                loan_group_items:
                  group.loan_group_items?.map((groupItem) => ({
                    ...groupItem,
                    items: firstOrNull(groupItem.items),
                  })) ?? [],
              })) ?? [],
          }
        : null,
      loan_user: normalizedLoanUser
        ? {
            ...normalizedLoanUser,
            profiles: Array.isArray(normalizedLoanUser.profiles)
              ? normalizedLoanUser.profiles[0] ?? null
              : normalizedLoanUser.profiles,
          }
        : null,
    }
  })

  const normalizedReturnHistory =
    returnHistory?.map((entry) => {
      const returnData = firstOrNull(entry.returns)
      const loanItemData = firstOrNull(entry.loan_items)

      const itemData = firstOrNull(loanItemData?.items)
      const unitData = firstOrNull(loanItemData?.item_units)
      const loanData = firstOrNull(loanItemData?.loans)

      const borrowerProfile = firstOrNull(loanData?.borrower_profile)
      const receiverProfile = firstOrNull(returnData?.receiver_profile)

      return {
        id: entry.id,
        return_id: entry.return_id,
        quantity_ok: entry.quantity_ok,
        quantity_damaged: entry.quantity_damaged,
        quantity_missing: entry.quantity_missing,
        notes: entry.notes,
        created_at: returnData?.created_at ?? null,
        item_name: itemData?.name ?? '-',
        item_code: itemData?.code ?? '-',
        unit_code: unitData?.asset_code ?? unitData?.serial_code ?? null,
        borrower_name: borrowerProfile?.full_name ?? 'Sin nombre',
        receiver_name: receiverProfile?.full_name ?? 'Sin nombre',
        loan_status: loanData?.status ?? null,
        pending_quantity: Math.max(0, (loanItemData?.quantity ?? 0) - (loanItemData?.returned_quantity ?? 0) - (loanItemData?.missing_quantity ?? 0)),
      }
    }) ?? []
  return (
    <main className="app-page">
      <div className="app-container">
        <PageHeader
          eyebrow="Operación"
          title="Gestión de devoluciones"
          description="Procesa devoluciones parciales o completas y revisa materiales pendientes."
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
          actions={<>
            <Link
              href="/dashboard"
              className="button-secondary"
            >
              Volver al dashboard
            </Link>

            <Link
              href="/prestamos"
              className="button-primary"
            >
              Ir a préstamos
            </Link>
          </>}
        />

        <ModuleTabs
          tabs={[
            {
              id: 'registrar',
              label: 'Registrar devolución',
              description: 'Procesa devoluciones parciales o totales de préstamos activos.',
            },
            {
              id: 'pendientes',
              label: 'Pendientes',
              description: 'Revisa los préstamos e ítems que todavía tienen cantidades por devolver.',
            },
            {
              id: 'historial',
              label: 'Historial',
              description: 'Consulta devoluciones registradas recientemente.',
            },
          ]}
        >
          <div className="surface-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Registrar devolución</h2>

            <ReturnForm loanItems={normalizedActiveLoanItems} />
          </div>

          <PendingReturnsList loanItems={normalizedActiveLoanItems} />

          <ReturnsHistory entries={normalizedReturnHistory} limit={50} />
        </ModuleTabs>
      </div>
    </main>
  )
}
