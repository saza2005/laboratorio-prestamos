import { loginUser } from './actions'

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
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-8 text-slate-900">
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

        <form action={loginUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">
              Correo
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 transition"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  )
}