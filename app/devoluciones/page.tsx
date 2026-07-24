import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReturnForm } from '@/app/devoluciones/return-form'
import { PendingReturnsList } from './pending-returns-list'
import { ReturnsHistory } from './returns-history'
import { canManageReturns, getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { firstOrNull } from '@/lib/supabase/query-utils'

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
    .limit(500)

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
        item_id,
        item_unit_id,
        loan_id,
        item_units:item_units(asset_code, serial_code),
        items:items(id, name, code),
        loans:loans(
          id,
          user_id,
          borrower_profile:profiles!loans_user_id_fkey(full_name, email)
        )
      )
    `)
    .order('created_at', { ascending: false, referencedTable: 'returns' })
    .limit(50)
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
      }
    }) ?? []
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Devoluciones</h1>
          <p className="text-slate-600">
            Usuario: {profile?.full_name} | Rol: {profile?.role}
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-slate-800 text-white px-4 py-2 hover:bg-slate-900 transition"
          >
            Volver al dashboard
          </Link>

          <Link
            href="/prestamos"
            className="inline-block rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition"
          >
            Ir a préstamos
          </Link>
        </div>

        <div className="mb-8 rounded-2xl bg-white shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Registrar devolución</h2>

          <ReturnForm loanItems={normalizedActiveLoanItems} />
        </div>

        <PendingReturnsList loanItems={normalizedActiveLoanItems} />
        <ReturnsHistory entries={normalizedReturnHistory} limit={50} />
      </div>
    </main>
  )
}
