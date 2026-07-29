import Link from 'next/link'
import { RequestForm } from '../request-form'
import { getEcuadorDate } from '@/lib/loan-status'
import { getRequestItems, getRequestPortalAuth } from '../shared'

export default async function NuevaSolicitudPage() {
  const { supabase } = await getRequestPortalAuth()
  const items = await getRequestItems(supabase)

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nueva solicitud individual</h1>
            <p className="mt-1 text-slate-600">Busca materiales y agrégalos a tu solicitud.</p>
          </div>

          <Link href="/solicitudes" className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-900">
            Volver al portal
          </Link>
        </div>

        <section className="rounded-lg bg-white p-4 shadow sm:p-6">
          <RequestForm items={items} minScheduledReturnDate={getEcuadorDate()} />
        </section>
      </div>
    </main>
  )
}
