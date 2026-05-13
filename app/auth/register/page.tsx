import { registerUser } from './actions'

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-8">
        <h1 className="text-2xl font-bold mb-2">Registro</h1>
        <p className="text-slate-600 mb-6">
          Crea una cuenta para usar el sistema
        </p>

        <form action={registerUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre completo</label>
            <input
              name="full_name"
              type="text"
              placeholder="Tu nombre"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Correo</label>
            <input
              name="email"
              type="email"
              placeholder="correo@ejemplo.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              name="password"
              type="password"
              placeholder="********"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 transition"
          >
            Crear cuenta
          </button>
        </form>
      </div>
    </main>
  )
}