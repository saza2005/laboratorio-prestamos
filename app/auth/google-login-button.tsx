'use client'

import { useFormStatus } from 'react-dom'
import { signInWithGoogle } from './oauth-actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? 'Redirigiendo...' : 'Entrar con Google institucional'}
    </button>
  )
}

export function GoogleLoginButton() {
  return (
    <form action={signInWithGoogle}>
      <SubmitButton />
    </form>
  )
}
