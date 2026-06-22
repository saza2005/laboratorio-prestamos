'use client'

import { useFormStatus } from 'react-dom'
import { linkGoogleIdentity } from './link-google-actions'

type LinkGoogleButtonProps = {
  className?: string
}

function SubmitButton({ className }: LinkGoogleButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className ?? ''} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pending ? 'Vinculando...' : 'Vincular Google'}
    </button>
  )
}

export function LinkGoogleButton({ className }: LinkGoogleButtonProps) {
  return (
    <form action={linkGoogleIdentity}>
      <SubmitButton className={className} />
    </form>
  )
}
