import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="surface-card w-full max-w-lg p-6 text-center sm:p-8">
        <p className="text-sm font-medium text-blue-700">Error 404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Página no encontrada
        </h1>
        <p className="mt-3 text-slate-600">
          La dirección ingresada no existe o ya no está disponible.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}
