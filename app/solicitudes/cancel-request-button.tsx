'use client'

import { useActionState } from 'react'
import { useConfirmSubmit } from '@/components/confirm-submit'
import { cancelOwnRequestWithState } from './actions'

type CancelRequestButtonProps = {
  requestId: string
}

export function CancelRequestButton({ requestId }: CancelRequestButtonProps) {
  const [state, formAction, isPending] = useActionState(cancelOwnRequestWithState, {
    error: null,
  })
  const confirmSubmit = useConfirmSubmit({
    title: 'Cancelar solicitud',
    message: 'Confirma que deseas cancelar esta solicitud.',
    confirmLabel: 'Cancelar solicitud',
  })

  return (
    <form
      action={formAction}
      className="mt-4"
      onSubmit={confirmSubmit.onSubmit}
    >
      {confirmSubmit.dialog}
      <input type="hidden" name="request_id" value={requestId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Cancelando...' : 'Cancelar solicitud'}
      </button>

      {state.error && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  )
}
