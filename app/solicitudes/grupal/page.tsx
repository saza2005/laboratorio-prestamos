import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RequestFormGroups } from '../request-form-groups'
import { getEcuadorDate } from '@/lib/loan-status'
import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import { getRequestItems, getRequestPortalAuth, getStudentsForGroups } from '../shared'
import { PageHeader } from '@/components/page-header'

export default async function SolicitudGrupalPage() {
  const { supabase, profile } = await getRequestPortalAuth()

  if (!canCreateGroupRequests(profile.role)) {
    redirect('/solicitudes')
  }

  const [items, students] = await Promise.all([
    getRequestItems(supabase),
    getStudentsForGroups(supabase, profile.role),
  ])

  return (
    <main className="app-page">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader eyebrow="Solicitudes" title="Nueva solicitud grupal" description="Organiza grupos, jefes de grupo y materiales solicitados." actions={<Link href="/solicitudes" className="button-secondary">
            Volver al portal
          </Link>} />

        <section className="surface-card p-4 sm:p-6">
          <RequestFormGroups
            items={items}
            students={students}
            minScheduledReturnDate={getEcuadorDate()}
          />
        </section>
      </div>
    </main>
  )
}
