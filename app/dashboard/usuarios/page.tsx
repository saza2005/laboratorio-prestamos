import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { redirect } from 'next/navigation'
import { RoleForm } from './role-form'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  canManageUsers,
  getHomeRouteByRole,
  isAssignableUserRole,
} from '@/lib/supabase/auth/roles'
import { ADMIN_USERS_LIMIT } from '@/lib/query-limits'
import { formatUserRole, userRoleBadgeClass } from '@/lib/status-format'
import { normalizeUserSearch } from './search'

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  let auth

  try {
    auth = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  const { supabase, user, profile } = auth

  if (!canManageUsers(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

  const { q } = await searchParams
  const search = normalizeUserSearch(q)
  let profilesQuery = supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .order('full_name', { ascending: true })
    .limit(ADMIN_USERS_LIMIT)

  if (search) {
    profilesQuery = profilesQuery.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  const { data: profiles, error } = await profilesQuery

  if (error) {
    throw new Error('No se pudo cargar la lista de usuarios.')
  }

  return (
    <main className="app-page">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Administración"
          title="Usuarios y roles"
          description="Consulta usuarios registrados y asigna roles operativos. Las cuentas administradoras permanecen protegidas."
          actions={<Link
            href="/dashboard"
            className="button-secondary"
          >
            Volver al dashboard
          </Link>}
        />

        <section className="surface-card p-4 sm:p-6">
          <form className="flex flex-col gap-3 sm:flex-row" method="get">
            <label htmlFor="user-search" className="sr-only">
              Buscar usuarios
            </label>
            <input
              id="user-search"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Buscar por nombre o correo"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white transition hover:bg-blue-700"
            >
              Buscar
            </button>
            {search && (
              <Link
                href="/dashboard/usuarios"
                className="rounded-lg border border-slate-300 px-5 py-2 text-center font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </Link>
            )}
          </form>
          <p className="mt-3 text-sm text-slate-500">
            {profiles?.length ?? 0} usuario(s) mostrado(s)
            {(profiles?.length ?? 0) === ADMIN_USERS_LIMIT
              ? ` · Límite de ${ADMIN_USERS_LIMIT} resultados`
              : ''}
          </p>
        </section>

        <section className="surface-card overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_150px_120px_minmax(280px,1fr)] gap-4 border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
            <span>Nombre</span>
            <span>Correo</span>
            <span>Rol actual</span>
            <span>Estado</span>
            <span>Administración</span>
          </div>

          {profiles && profiles.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {profiles.map((listedProfile) => {
                const protectedAccount =
                  listedProfile.role === 'admin' || listedProfile.id === user.id

                return (
                  <article
                    key={listedProfile.id}
                    className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_150px_120px_minmax(280px,1fr)] lg:items-center lg:gap-4"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-medium uppercase text-slate-400 lg:hidden">
                        Nombre
                      </span>
                      <p className="truncate font-medium text-slate-900">
                        {listedProfile.full_name || 'Sin nombre'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium uppercase text-slate-400 lg:hidden">
                        Correo
                      </span>
                      <p className="truncate text-slate-600">{listedProfile.email}</p>
                    </div>
                    {protectedAccount || !isAssignableUserRole(listedProfile.role) ? (
                      <>
                        <div>
                          <span className="text-xs font-medium uppercase text-slate-400 lg:hidden">
                            Rol actual
                          </span>
                          <p>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${userRoleBadgeClass(listedProfile.role)}`}
                            >
                              {formatUserRole(listedProfile.role)}
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium uppercase text-slate-400 lg:hidden">
                            Estado
                          </span>
                          <p className={listedProfile.is_active ? 'text-emerald-700' : 'text-slate-500'}>
                            {listedProfile.is_active ? 'Activo' : 'Inactivo'}
                          </p>
                        </div>
                        <div>
                        <p className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-700">
                          Cuenta administradora protegida
                        </p>
                        </div>
                      </>
                    ) : (
                        <RoleForm
                          profileId={listedProfile.id}
                          currentRole={listedProfile.role}
                          isActive={listedProfile.is_active}
                        />
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No se encontraron usuarios con ese criterio.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
