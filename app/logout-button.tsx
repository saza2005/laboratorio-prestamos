'use client'

import { useFormStatus } from 'react-dom'
import { logoutUser } from '@/app/dashboard/actions'

type LogoutButtonProps = {
  className?: string
}

function SubmitButton({ className }: LogoutButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className ?? ''} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pending ? 'Cerrando sesión...' : 'Cerrar sesión'}
    </button>
  )
}

export function LogoutButton({ className }: LogoutButtonProps) {
  return (
    <form action={logoutUser}>
      <SubmitButton className={className} />
    </form>
  )
}
