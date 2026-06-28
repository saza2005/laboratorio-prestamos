import Link from 'next/link'
import { getOwnLoans, getRequestPortalAuth } from '../shared'
import { LoansList } from './loans-list'

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
          <Link
            href="/solicitudes"
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            Volver al portal
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Mis préstamos</h1>
          <p className="mt-1 text-slate-600">
            Consulta préstamos activos, pendientes y devueltos.
          </p>
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
            <p className="text-sm text-slate-500">
              Selecciona un préstamo para revisar sus materiales y estado de devolución.
            </p>
          </div>

          <LoansList loans={loans} />
        </section>
      </div>
    </main>
  )
}
