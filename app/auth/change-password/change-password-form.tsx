'use client'

import { useActionState } from 'react'
import { changePasswordWithState } from './actions'

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordWithState,
    { error: null, success: null }
  )

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="current-password" className="mb-1 block text-sm font-medium">
          Contraseña actual
        </label>
        <input
          id="current-password"
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          name="new_password"
          type="password"
          required
          minLength={6}
          maxLength={128}
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">
          Confirmar nueva contraseña
        </label>
        <input
          id="confirm-password"
          name="confirm_password"
          type="password"
          required
          minLength={6}
          maxLength={128}
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-slate-900 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Actualizando...' : 'Cambiar contraseña'}
      </button>

      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.success}
        </p>
      )}
    </form>
  )
}
