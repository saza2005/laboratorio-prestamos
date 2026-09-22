'use client'

import { useEffect, useRef } from 'react'
import { AppIcon } from './app-icon'

export function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    focusable?.[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose()
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-dialog-title"
        aria-describedby="support-dialog-description"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <AppIcon name="support" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Ayuda y contacto</p>
              <h2 id="support-dialog-title" className="mt-0.5 text-lg font-bold text-slate-950">Soporte del sistema</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="button-secondary min-h-10 min-w-10 p-2" aria-label="Cerrar soporte">
            <AppIcon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
          <p id="support-dialog-description" className="text-sm leading-6 text-slate-600">
            Para consultas, inconvenientes técnicos o soporte relacionado con la plataforma, puede comunicarse con el equipo de desarrollo.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="support-santiago">
              <h3 id="support-santiago" className="font-semibold text-slate-950">Santiago Zumba</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-slate-500">Correo</dt>
                  <dd className="mt-0.5 break-all"><a className="font-medium text-blue-700 underline-offset-4 hover:underline" href="mailto:santiago.zumbaa@ucuenca.edu.ec">santiago.zumbaa@ucuenca.edu.ec</a></dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Teléfono</dt>
                  <dd className="mt-0.5"><a className="font-medium text-blue-700 underline-offset-4 hover:underline" href="tel:0969075517">0969075517</a></dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="support-juan">
              <h3 id="support-juan" className="font-semibold text-slate-950">Juan Pacheco</h3>
              <dl className="mt-3 text-sm">
                <div>
                  <dt className="font-medium text-slate-500">Correo</dt>
                  <dd className="mt-0.5 break-all"><a className="font-medium text-blue-700 underline-offset-4 hover:underline" href="mailto:juan.pachecog@ucuenca.edu.ec">juan.pachecog@ucuenca.edu.ec</a></dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-slate-500">Desarrollado para el Laboratorio de la Universidad de Cuenca</p>
          <button type="button" onClick={onClose} className="button-primary min-h-10 px-4 py-2 text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
