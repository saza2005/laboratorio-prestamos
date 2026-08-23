'use client'

import { useActionState, useEffect, useRef } from 'react'
import { changeOwnPassword } from './change-password-actions'

const initialState = { success: false, message: '' }

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changeOwnPassword,
    initialState
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <details>
      <summary className="button-secondary cursor-pointer list-none text-center text-sm">
        Cambiar contraseña
      </summary>

      <div className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-5 sm:w-88">
        <h2 className="text-base font-semibold text-slate-900">
          Seguridad de la cuenta
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Confirme su contraseña actual antes de establecer una nueva.
        </p>

        <form ref={formRef} action={formAction} className="mt-4 space-y-4">
          <div>
            <label className="form-label" htmlFor="current-password">
              Contraseña actual
            </label>
            <input
              className="form-control"
              id="current-password"
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="new-password">
              Nueva contraseña
            </label>
            <input
              className="form-control"
              id="new-password"
              name="new_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isPending}
            />
            <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
          </div>

          <div>
            <label className="form-label" htmlFor="confirm-password">
              Confirmar nueva contraseña
            </label>
            <input
              className="form-control"
              id="confirm-password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={isPending}
            />
          </div>

          {state.message && (
            <p
              aria-live="polite"
              className={`rounded-lg border px-3 py-2 text-sm ${
                state.success
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {state.message}
            </p>
          )}

          <button
            className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={isPending}
          >
            {isPending ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </details>
  )
}
