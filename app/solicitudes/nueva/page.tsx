import Link from 'next/link'
import { RequestForm } from '../request-form'
import { getEcuadorDate } from '@/lib/loan-status'
import { getRequestItems, getRequestPortalAuth } from '../shared'
import { PageHeader } from '@/components/page-header'

export default async function NuevaSolicitudPage() {
  const { supabase } = await getRequestPortalAuth()
  const items = await getRequestItems(supabase)

  return (
    <main className="app-page">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader eyebrow="Solicitudes" title="Nueva solicitud individual" description="Busca materiales disponibles y agrégalos a tu solicitud." actions={<Link href="/solicitudes" className="button-secondary">
            Volver al portal
          </Link>} />

        <section className="surface-card p-4 sm:p-6">
          <RequestForm items={items} minScheduledReturnDate={getEcuadorDate()} />
        </section>
      </div>
    </main>
  )
}
