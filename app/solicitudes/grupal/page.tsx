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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nueva solicitud grupal</h1>
            <p className="mt-1 text-slate-600">Organiza grupos, jefes de grupo y materiales solicitados.</p>
          </div>

          <Link href="/solicitudes" className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-900">
            Volver al portal
          </Link>
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
