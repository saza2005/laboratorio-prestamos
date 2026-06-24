import Link from 'next/link'
import { formatDateTime } from '@/lib/format-date'
import {
  formatLoanStatus,
  getOwnLoans,
  getRequestPortalAuth,
  loanStatusBadgeClass,
} from '../shared'

export default async function MisPrestamosPage() {
  const { supabase, user } = await getRequestPortalAuth()
  const loans = await getOwnLoans(supabase, user.id)
  const activeLoans = loans.filter((loan) =>
    ['active', 'partial_return', 'overdue'].includes(loan.status)
  ).length
  const overdueLoans = loans.filter((loan) => loan.status === 'overdue').length

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/solicitudes" className="text-sm font-medium text-blue-700 hover:underline">
            Volver al portal
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Mis préstamos</h1>
          <p className="mt-1 text-slate-600">Consulta préstamos activos, pendientes y devueltos.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold">{loans.length}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Activos</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{activeLoans}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-slate-500">Vencidos</p>
            <p className="mt-2 text-3xl font-bold text-red-700">{overdueLoans}</p>
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow sm:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Listado de préstamos</h2>
            <p className="text-sm text-slate-500">Mostrando tus últimos 50 préstamos</p>
          </div>

          <div className="space-y-4">
            {loans.length > 0 ? (
              loans.map((loan) => (
                <div key={loan.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Entregado: {formatDateTime(loan.delivery_date)}</p>
                      <p className="text-sm"><span className="font-medium">Devolución esperada:</span> {loan.expected_return_date || '-'}</p>
                    </div>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${loanStatusBadgeClass(loan.status)}`}>
                      {formatLoanStatus(loan.status)}
                    </span>
                  </div>

                  {loan.loan_groups.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {loan.loan_groups.map((group) => (
                        <div key={group.id} className="rounded-lg border bg-slate-50 p-3">
                          <p className="text-sm font-medium">
                            {group.group_name} - {group.leader?.full_name ?? 'Sin asignar'}
                          </p>
                          <ul className="mt-2 space-y-1 text-sm">
                            {group.loan_group_items.map((gi, i) => (
                              <li key={i}>{gi.item?.name ?? 'Ítem'} - {gi.quantity}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-[720px] text-sm">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-4 py-3 text-left">Ítem</th>
                            <th className="px-4 py-3 text-left">Código</th>
                            <th className="px-4 py-3 text-left">Cantidad</th>
                            <th className="px-4 py-3 text-left">Devuelto</th>
                            <th className="px-4 py-3 text-left">Dañado</th>
                            <th className="px-4 py-3 text-left">Pendiente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loan.loan_items.map((li) => (
                            <tr key={li.id} className="border-t">
                              <td className="px-4 py-3">{li.item?.name ?? '-'}</td>
                              <td className="px-4 py-3">{li.item?.code ?? '-'}</td>
                              <td className="px-4 py-3">{li.quantity}</td>
                              <td className="px-4 py-3">{li.returned_quantity}</td>
                              <td className="px-4 py-3">{li.damaged_quantity}</td>
                              <td className="px-4 py-3">{li.pending}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {loan.status === 'active' || loan.status === 'partial_return' ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Debe entregar físicamente estos materiales al laboratorio para que el personal registre la devolución.
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-slate-500">No tienes préstamos registrados.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
