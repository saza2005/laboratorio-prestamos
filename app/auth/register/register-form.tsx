'use client'

import { useActionState } from 'react'
import { registerUserWithState } from './actions'

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerUserWithState,
    { error: null }
  )

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="full-name" className="mb-1 block text-sm font-medium">
          Nombre completo
        </label>
        <input
          id="full-name"
          name="full_name"
          type="text"
          required
          autoComplete="name"
          placeholder="Tu nombre"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="register-email" className="mb-1 block text-sm font-medium">
          Correo
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="correo@ejemplo.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="register-password"
          className="mb-1 block text-sm font-medium"
        >
          Contraseña
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-slate-900 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  )
}
