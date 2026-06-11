'use client'

import { useFormStatus } from 'react-dom'
import { loginUser } from './actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? 'Ingresando...' : 'Entrar'}
    </button>
  )
}

export function LoginForm() {
  return (
    <form action={loginUser} className="space-y-4">
      <div>
        <label
          htmlFor="login-email"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Correo
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Contraseña
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400"
        />
      </div>

      <SubmitButton />
    </form>
  )
}
