import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RequestFormGroups } from '../request-form-groups'
import { getEcuadorDate } from '@/lib/loan-status'
import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import { getRequestItems, getRequestPortalAuth, getStudentsForGroups } from '../shared'

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
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/solicitudes" className="text-sm font-medium text-blue-700 hover:underline">
            Volver al portal
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Nueva solicitud grupal</h1>
          <p className="mt-1 text-slate-600">Organiza grupos, jefes de grupo y materiales solicitados.</p>
        </div>

        <section className="rounded-lg bg-white p-4 shadow sm:p-6">
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
