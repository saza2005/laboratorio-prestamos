import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { ChangePasswordForm } from './change-password-form'

export default async function ChangePasswordPage() {
  try {
    await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow sm:p-8">
        <h1 className="mb-2 text-2xl font-bold">Cambiar contraseña</h1>
        <p className="mb-6 text-slate-600">
          Actualiza tu contraseña de acceso al sistema.
        </p>

        <ChangePasswordForm />

        <div className="mt-6 text-center text-sm">
          <Link
            href="/dashboard"
            className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
