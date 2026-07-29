import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12 text-slate-900 sm:px-6">
      <div className="w-full max-w-2xl text-center">
        <h1 className="mb-4 text-3xl font-bold sm:text-4xl">
          Sistema de Gestión de Laboratorio
        </h1>

        <p className="mb-8 text-base text-slate-600 sm:text-lg">
          Plataforma para préstamos, devoluciones, inventario y trazabilidad de
          materiales.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/login"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Iniciar sesión
          </Link>

          <Link
            href="/auth/register"
            className="rounded-lg border border-slate-300 px-6 py-3 font-medium transition hover:bg-slate-50"
          >
            Registro institucional
          </Link>
        </div>
      </div>
    </main>
  )
}
