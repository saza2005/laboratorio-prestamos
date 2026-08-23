import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 text-slate-900 sm:px-6">
      <div className="surface-card w-full max-w-2xl overflow-hidden text-center">
        <div className="h-1.5 bg-blue-700" />
        <div className="p-7 sm:p-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Universidad de Cuenca</p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Sistema de Gestión de Laboratorio
        </h1>

        <p className="mb-8 text-base text-slate-600 sm:text-lg">
          Plataforma para préstamos, devoluciones, inventario y trazabilidad de
          materiales.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/login"
            className="button-primary px-6 py-3"
          >
            Iniciar sesión
          </Link>

          <Link
            href="/auth/register"
            className="button-quiet px-6 py-3"
          >
            Registro institucional
          </Link>
        </div>
        </div>
      </div>
    </main>
  )
}
