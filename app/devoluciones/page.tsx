import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReturnForm } from '@/app/devoluciones/return-form'
import { ReturnsHistory } from './returns-history'
import { canManageReturns, getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}
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

          <ReturnForm
            loanItems={activeLoanItems.map((li) => {
              const normalizedLoanUser =
                Array.isArray(li.loan_user) ? li.loan_user[0] ?? null : li.loan_user

              return {
                ...li,
                items: Array.isArray(li.items) ? li.items[0] ?? null : li.items,
                item_units: Array.isArray(li.item_units) ? li.item_units[0] ?? null : li.item_units,
                loans: Array.isArray(li.loans) ? li.loans[0] ?? null : li.loans,
                loan_user: normalizedLoanUser
                  ? {
                      ...normalizedLoanUser,
                      profiles: Array.isArray(normalizedLoanUser.profiles)
                        ? normalizedLoanUser.profiles[0] ?? null
                        : normalizedLoanUser.profiles,
                    }
                  : null,
              }
            })}
          />
        </div>

        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Préstamos pendientes</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-4 py-3">Usuario</th>
                  <th className="text-left px-4 py-3">Ítem</th>
                  <th className="text-left px-4 py-3">Unidad</th>
                  <th className="text-left px-4 py-3">Cantidad</th>
                  <th className="text-left px-4 py-3">Devuelto</th>
                  <th className="text-left px-4 py-3">Perdido</th>
                  <th className="text-left px-4 py-3">Pendiente</th>
                  <th className="text-left px-4 py-3">Estado préstamo</th>
                </tr>
              </thead>
              <tbody>
                {activeLoanItems.length > 0 ? (
                  activeLoanItems.map((li) => {

                  const itemData = firstOrNull(li.items) as
                    | { id?: string; name?: string; code?: string }
                    | null

                  const loanData = firstOrNull(li.loans) as
                    | {
                        id?: string
                        status?: string
                        user_id?: string
                        delivery_date?: string
                        expected_return_date?: string
                        loan_groups?: {
                          id: string
                          group_name: string
                          leader?: {
                            full_name?: string
                            email?: string
                          } | null
                          loan_group_items?: {
                            id: string
                            item_id?: string
                            quantity: number
                            items?: {
                              id?: string
                              name?: string
                              code?: string
                            } | null
                          }[]
                        }[]
                      }
                    | null

                  const loanUserRaw = firstOrNull(li.loan_user) as
                    | {
                        user_id?: string
                        profiles?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null
                      }
                    | null

                  const loanUserData = loanUserRaw
                    ? {
                        ...loanUserRaw,
                        profiles: firstOrNull(loanUserRaw.profiles),
                      }
                    : null

                    const perdido = li.missing_quantity ?? 0
                    const pendiente =
                      li.quantity -
                      li.returned_quantity -
                      perdido

                    return (
                      <tr key={li.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">
                          {loanUserData?.profiles?.full_name ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">
                              {itemData?.name ?? '-'} [{itemData?.code ?? '-'}]
                            </p>
                            {Array.isArray(loanData?.loan_groups) &&
                              loanData.loan_groups.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {loanData.loan_groups.map((group) => {
                                    const matchingItems =
                                      group.loan_group_items?.filter(
                                        (gi) => gi.item_id === li.item_id
                                      ) ?? []

                                    if (matchingItems.length === 0) {
                                      return null
                                    }

                                    return (
                                      <div
                                        key={group.id}
                                        className="rounded-lg bg-slate-50 border px-3 py-2 text-xs text-slate-600"
                                      >
                                        <p className="font-medium text-slate-700">
                                          {group.group_name} — jefe:{' '}
                                          {group.leader?.full_name ?? 'Sin asignar'}
                                        </p>

                                        {matchingItems.map((gi) => (
                                          <p key={gi.id}>
                                            Cantidad asignada a este grupo: {gi.quantity}
                                          </p>
                                        ))}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {firstOrNull(li.item_units)?.asset_code || firstOrNull(li.item_units)?.serial_code || '-'}
                        </td>
                        <td className="px-4 py-3">{li.quantity}</td>
                        <td className="px-4 py-3">{li.returned_quantity}</td>
                        <td className="px-4 py-3">{perdido}</td>
                        <td className="px-4 py-3">{pendiente}</td>
                        <td className="px-4 py-3">{loanData?.status ?? '-'}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      No hay préstamos pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <ReturnsHistory entries={normalizedReturnHistory} limit={50} />
      </div>
    </main>
  )
}