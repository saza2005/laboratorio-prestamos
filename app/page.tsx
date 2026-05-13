export default function HomePage() {
  return (
    <main className="min-h-screen bg-whithe text-slate-900 flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">
          Sistema de Gestión de Laboratorio
        </h1>

        <p className="text-lg text-slate-600 mb-8">
          Plataforma para préstamos, devoluciones, inventario y trazabilidad de materiales.
        </p>

        <div className="flex gap-4 justify-center">
          <a
            href="/auth/login"
            className="rounded-xl bg-blue-600 text-white px-6 py-3 font-medium hover:bg-blue-700 transition"
          >
            Iniciar sesión
          </a>

          <a
            href="/auth/register"
            className="rounded-xl border border-slate-300 px-6 py-3 font-medium hover:bg-slate-50 transition"
          >
            Registrarse
          </a>
        </div>
      </div>
    </main>
  )
}