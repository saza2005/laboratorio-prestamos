'use client'

import { useActionState } from 'react'
import { requestAssetClearanceCertificate } from './actions'

export function CertificateRequestButton({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(requestAssetClearanceCertificate, {
    error: null,
    success: null,
  })

  return (
    <form action={action} className="space-y-3">
      <button type="submit" className="button-primary" disabled={disabled || pending}>
        {pending ? 'Enviando solicitud...' : 'Solicitar certificado de no adeudo'}
      </button>
      {disabled && (
        <p className="text-sm text-amber-700">Ya tiene una solicitud pendiente o aprobada.</p>
      )}
      <div aria-live="polite">
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      </div>
    </form>
  )
}
