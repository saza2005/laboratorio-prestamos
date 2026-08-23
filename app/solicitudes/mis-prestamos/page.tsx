import Link from 'next/link'
import { getOwnLoans, getRequestPortalAuth } from '../shared'
import { LoansList } from './loans-list'
import { PageHeader } from '@/components/page-header'

export default async function MisPrestamosPage() {
  const { supabase, user } = await getRequestPortalAuth()
  const loans = await getOwnLoans(supabase, user.id)
  const activeLoans = loans.filter((loan) =>
    ['active', 'partial_return', 'overdue'].includes(loan.status)
  ).length
  const overdueLoans = loans.filter((loan) => loan.status === 'overdue').length

  return (
    <main className="app-page">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader eyebrow="Seguimiento" title="Mis préstamos" description="Consulta préstamos activos, pendientes y devueltos." actions={<Link
            href="/solicitudes"
            className="button-secondary"
          >
            Volver al portal
          </Link>} />

        <section className="grid gap-4 md:grid-cols-3">
          <div className="surface-card p-5">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold">{loans.length}</p>
          </div>
          <div className="surface-card p-5">
            <p className="text-sm text-slate-500">Activos</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{activeLoans}</p>
          </div>
          <div className="surface-card p-5">
            <p className="text-sm text-slate-500">Vencidos</p>
            <p className="mt-2 text-3xl font-bold text-red-700">{overdueLoans}</p>
          </div>
        </section>

        <section className="surface-card p-4 sm:p-6">
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
