import Link from 'next/link'
import { LoginForm } from './login-form'
import { GoogleLoginButton } from '../google-login-button'

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string
    registered?: string
  }>
}

function getRegistrationMessage(registered?: string) {
  if (registered === 'check_email') {
    return 'Cuenta creada. Revisa tu correo para confirmar el registro antes de iniciar sesión.'
  }

  return null
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
    case 'email_not_confirmed':
      return 'Debe confirmar su correo institucional antes de iniciar sesión.'
    case 'invalid_domain':
      return 'Solo se permite el acceso con cuentas @ucuenca.edu.ec.'
    case 'google_auth_failed':
      return 'No se pudo iniciar sesión con Google. Intente nuevamente.'
    case 'password_login_disabled':
      return 'El acceso con contraseña está reservado para administradores y laboratoristas. Use Google institucional.'
    case 'profile_link_failed':
      return 'No se pudo enlazar el perfil institucional. Si ya tenía solicitudes o préstamos de prueba, contacte al administrador.'
    case 'google_link_required':
      return 'Ya existe un perfil con ese correo. Inicie sesión con contraseña y use Vincular Google desde el dashboard.'
    default:
      return null
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const errorMessage = getErrorMessage(params?.error)
  const registrationMessage = getRegistrationMessage(params?.registered)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="surface-card w-full max-w-md overflow-hidden text-slate-900">
        <div className="h-1.5 bg-blue-700" />
        <div className="p-6 sm:p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Acceso institucional</p>
        <h1 className="text-2xl font-bold mb-2 text-slate-900">
          Iniciar sesión
        </h1>

        <p className="text-slate-600 mb-6">
          Accede con tu cuenta institucional @ucuenca.edu.ec
        </p>

        {registrationMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {registrationMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="space-y-5">
          <GoogleLoginButton />

          <div className="flex items-center gap-3 text-xs uppercase text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            Cuentas existentes
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <LoginForm />
        </div>

        <div className="mt-6 space-y-2 text-center text-sm">
          <p className="text-slate-600">
            Usuarios nuevos entran con Google institucional. Usuarios existentes pueden iniciar con contraseña y vincular Google desde el dashboard.
          </p>
          <Link
            href="/"
            className="inline-block font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
        </div>
      </div>
    </main>
  )
}
