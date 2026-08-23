'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { getSafePageErrorMessage } from '@/lib/action-error'

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

  const message = getSafePageErrorMessage(error)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="surface-card w-full max-w-lg p-6 sm:p-8">
        <p className="text-sm font-medium text-red-700">Error del sistema</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          No se pudo cargar esta sección
        </h1>
        <p className="mt-3 text-slate-600">
          {message}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Puede intentarlo nuevamente o volver a una sección estable.
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
            className="button-primary"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="button-quiet"
          >
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  )
}
