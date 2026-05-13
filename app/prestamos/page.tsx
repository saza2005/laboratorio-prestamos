import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoanForm } from './loan-form'
import { canManageLoans } from '@/lib/supabase/auth/roles'

export default async function PrestamosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
    if (!canManageLoans(profile?.role)) {
      redirect('/dashboard')
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

  const { data: loans } = await supabase
    .from('loans')
    .select(`
      id,
      delivery_date,
      expected_return_date,
      status,
      profiles:profiles!loans_user_id_fkey(full_name, email)
    `)
    .order('delivery_date', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestión de Préstamos</h1>
          <p className="text-slate-600">
            Usuario: {profile?.full_name} | Rol: {profile?.role}
          </p>
        </div>

        <div className="mb-6">
          <a
            href="/dashboard"
            className="inline-block rounded-lg bg-slate-800 text-white px-4 py-2 hover:bg-slate-900 transition"
          >
            Volver al dashboard
          </a>
        </div>

        <div className="mb-8 rounded-2xl bg-white shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Registrar préstamo</h2>
          <LoanForm users={users ?? []} items={items ?? []} />
        </div>

        <div className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Préstamos registrados</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left px-4 py-3">Usuario</th>
                  <th className="text-left px-4 py-3">Correo</th>
                  <th className="text-left px-4 py-3">Entrega</th>
                  <th className="text-left px-4 py-3">Devolución esperada</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loans && loans.length > 0 ? (
                  loans.map((loan) => {
                    const profileData = loan.profiles as
                      | { full_name?: string; email?: string }
                      | null

                    return (
                      <tr key={loan.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-3">{profileData?.full_name || '-'}</td>
                        <td className="px-4 py-3">{profileData?.email || '-'}</td>
                        <td className="px-4 py-3">
                          {new Date(loan.delivery_date).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">{loan.expected_return_date || '-'}</td>
                        <td className="px-4 py-3">{loan.status}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No hay préstamos registrados todavía.
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