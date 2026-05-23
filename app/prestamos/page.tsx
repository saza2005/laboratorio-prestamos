import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoanForm } from './loan-form'
import { canManageLoans, getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import { formatDateTime } from '@/lib/format-date'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function formatLoanStatus(status: string) {
  switch (status) {
    case 'active':
      return 'Activo'
    case 'returned':
      return 'Devuelto'
    case 'partial_return':
      return 'Devolución parcial'
    case 'overdue':
      return 'Vencido'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status
  }
}

function loanStatusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'returned':
      return 'bg-green-100 text-green-700'
    case 'partial_return':
      return 'bg-amber-100 text-amber-700'
    case 'overdue':
      return 'bg-red-100 text-red-700'
    case 'cancelled':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export default async function PrestamosPage() {
  let auth

  try {
    auth = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  const { supabase, profile } = auth

  if (!canManageLoans(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name', { ascending: true })

  const { data: items } = await supabase
    .from('items')
    .select('id, code, name, stock_available, item_type, track_individual')
    .eq('status', 'active')
    .order('name', { ascending: true })

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
    .limit(50)

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
        status: loan.status,
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
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Préstamos</h1>
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
          <h2 className="text-xl font-semibold mb-4">Registrar préstamo</h2>
          <LoanForm users={users ?? []} items={items ?? []} />
        </div>

        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Préstamos registrados</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mostrando los últimos 50 préstamos registrados
            </p>
          </div>

          <div className="p-6 space-y-6">
            {loans.length > 0 ? (
              loans.map((loan) => (
                <div
                  key={loan.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {loan.borrower_name}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {loan.borrower_email}
                      </p>

                      <div className="mt-3 grid gap-1 text-sm text-slate-700">
                        <p>
                          <span className="font-medium">Entrega:</span>{' '}
                          {loan.delivery_date
                            ? formatDateTime(loan.delivery_date)
                            : '-'}
                        </p>
                        <p>
                          <span className="font-medium">
                            Devolución esperada:
                          </span>{' '}
                          {loan.expected_return_date || '-'}
                        </p>
                        <p>
                          <span className="font-medium">Devuelto:</span>{' '}
                          {loan.returned_at
                            ? formatDateTime(loan.returned_at)
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${loanStatusBadgeClass(
                        loan.status
                      )}`}
                    >
                      {formatLoanStatus(loan.status)}
                    </span>
                  </div>

                  {loan.notes && (
                    <p className="mt-3 text-sm text-slate-600">
                      <span className="font-medium">Notas:</span> {loan.notes}
                    </p>
                  )}

                  <div className="mt-5">
                    <h4 className="font-semibold mb-3">Materiales prestados</h4>

                    <div className="overflow-x-auto rounded-xl border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="text-left px-4 py-3">Ítem</th>
                            <th className="text-left px-4 py-3">Código</th>
                            <th className="text-left px-4 py-3">Cantidad</th>
                            <th className="text-left px-4 py-3">Devuelto</th>
                            <th className="text-left px-4 py-3">Dañado</th>
                            <th className="text-left px-4 py-3">Faltante</th>
                            <th className="text-left px-4 py-3">Pendiente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loan.loan_items.length > 0 ? (
                            loan.loan_items.map((li) => (
                              <tr key={li.id} className="border-t">
                                <td className="px-4 py-3">
                                  {li.item?.name ?? '-'}
                                </td>
                                <td className="px-4 py-3">
                                  {li.item?.code ?? '-'}
                                </td>
                                <td className="px-4 py-3">{li.quantity}</td>
                                <td className="px-4 py-3">
                                  {li.returned_quantity}
                                </td>
                                <td className="px-4 py-3">
                                  {li.damaged_quantity}
                                </td>
                                <td className="px-4 py-3">
                                  {li.missing_quantity}
                                </td>
                                <td className="px-4 py-3 font-medium">
                                  {li.pending}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-4 py-6 text-center text-slate-500"
                              >
                                No hay materiales registrados para este préstamo.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {loan.loan_groups.length > 0 && (
                    <div className="mt-5">
                      <h4 className="font-semibold mb-3">
                        Distribución por grupos
                      </h4>

                      <div className="space-y-3">
                        {loan.loan_groups.map((group) => (
                          <div
                            key={group.id}
                            className="rounded-xl border bg-slate-50 p-4"
                          >
                            <div className="mb-3">
                              <p className="font-medium">
                                {group.group_name}
                              </p>
                              <p className="text-sm text-slate-600">
                                Jefe de grupo: {group.leader_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {group.leader_email}
                              </p>
                            </div>

                            <ul className="space-y-1 text-sm">
                              {group.loan_group_items.map((gi) => (
                                <li key={gi.id}>
                                  {gi.item?.name ?? 'Ítem'} [
                                  {gi.item?.code ?? '-'}] — {gi.quantity}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-500">
                No hay préstamos registrados todavía.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}