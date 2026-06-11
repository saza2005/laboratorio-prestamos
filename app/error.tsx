'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-lg rounded-lg bg-white p-6 shadow sm:p-8">
        <p className="text-sm font-medium text-red-700">Error del sistema</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          No se pudo cargar esta sección
        </h1>
        <p className="mt-3 text-slate-600">
          La operación no se completó. Puede intentarlo nuevamente o volver a
          una sección estable.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-slate-500">
            Referencia: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-center font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  )
}
