import Link from 'next/link'
import { LoginForm } from './login-form'

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string
  }>
}

function getErrorMessage(error?: string) {
  switch (error) {
    case 'missing_credentials':
      return 'Debe ingresar correo y contraseña.'
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos. Verifique los datos e intente nuevamente.'
    case 'no_user':
      return 'No se pudo iniciar sesión. Intente nuevamente.'
    case 'no_profile':
      return 'El usuario existe en autenticación, pero no tiene perfil registrado en el sistema.'
    default:
      return null
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const errorMessage = getErrorMessage(params?.error)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="w-full max-w-md rounded-lg bg-white p-6 text-slate-900 shadow sm:p-8">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">
          Iniciar sesión
        </h1>

        <p className="text-slate-600 mb-6">
          Accede al sistema de laboratorio
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <LoginForm />

        <div className="mt-6 space-y-2 text-center text-sm">
          <p className="text-slate-600">
            ¿No tienes una cuenta?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-blue-700 hover:underline"
            >
              Regístrate
            </Link>
          </p>
          <Link
            href="/"
            className="inline-block font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
