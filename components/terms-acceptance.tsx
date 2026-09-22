'use client'

import { useId, useRef } from 'react'
import {
  LOAN_TERMS_ACCEPTED_VALUE,
  LOAN_TERMS_CLOSING,
  LOAN_TERMS_FIELD,
  LOAN_TERMS_INTRO,
  LOAN_TERMS_ITEMS,
  LOAN_TERMS_TITLE,
  LOAN_TERMS_VERSION,
} from '@/lib/loan-terms'

type TermsAcceptanceProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function TermsAcceptance({
  checked,
  onCheckedChange,
  disabled = false,
}: TermsAcceptanceProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const checkboxId = useId()
  const titleId = useId()
  const descriptionId = useId()

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          name={LOAN_TERMS_FIELD}
          type="checkbox"
          value={LOAN_TERMS_ACCEPTED_VALUE}
          required
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          disabled={disabled}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="min-w-0">
          <label
            htmlFor={checkboxId}
            className="text-sm font-medium text-slate-800"
          >
            Acepto los términos y condiciones del préstamo de bienes del
            laboratorio.
          </label>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="mt-1 block rounded text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Ver términos y condiciones
          </button>
          {!checked && (
            <p className="mt-2 text-sm text-amber-700">
              Debes aceptar los términos y condiciones antes de continuar.
            </p>
          )}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={() => dialogRef.current?.close()}
        className="m-auto w-[min(92vw,44rem)] rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-bold text-slate-950 sm:text-xl">
              {LOAN_TERMS_TITLE}
            </h2>
            <button
              type="button"
              aria-label="Cerrar términos y condiciones"
              onClick={() => dialogRef.current?.close()}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Cerrar
            </button>
          </div>

          <div id={descriptionId} className="mt-5 space-y-4 text-sm leading-6">
            <p>{LOAN_TERMS_INTRO}</p>
            <ul className="list-disc space-y-2 pl-5">
              {LOAN_TERMS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{LOAN_TERMS_CLOSING}</p>
            <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
              Versión de términos: {LOAN_TERMS_VERSION}
            </p>
          </div>
        </div>
      </dialog>
    </section>
  )
}
