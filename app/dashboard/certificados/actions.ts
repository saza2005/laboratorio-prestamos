'use server'

import { revalidatePath } from 'next/cache'
import { getActionErrorMessage } from '@/lib/action-error'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageAssetClearanceCertificates } from '@/lib/supabase/auth/roles'

export type CertificateReviewActionState = {
  error: string | null
  success: string | null
}

export type CertificateGenerationActionState = CertificateReviewActionState

export async function reviewAssetClearanceCertificate(
  _previousState: CertificateReviewActionState,
  formData: FormData
): Promise<CertificateReviewActionState> {
  try {
    const { supabase, profile } = await getAuthProfile()

    if (!canManageAssetClearanceCertificates(profile.role)) {
      throw new Error('No tiene permisos para revisar certificados.')
    }

    const certificateId = String(formData.get('certificate_id') ?? '').trim()
    const decision = String(formData.get('decision') ?? '').trim()
    const observations = String(formData.get('observations') ?? '').trim()
    const rejectionReason = String(formData.get('rejection_reason') ?? '').trim()

    if (!certificateId) throw new Error('La solicitud seleccionada no es válida.')
    if (decision !== 'approved' && decision !== 'rejected') throw new Error('Seleccione una decisión válida.')
    if (decision === 'rejected' && !rejectionReason) throw new Error('Debe indicar el motivo del rechazo.')

    const { data, error } = await supabase.rpc('review_asset_clearance_certificate', {
      p_certificate_id: certificateId,
      p_decision: decision,
      p_observations: observations || null,
      p_rejection_reason: decision === 'rejected' ? rejectionReason : null,
    })

    if (error) throw new Error(error.message)
    if (!data) throw new Error('No se pudo identificar la solicitud revisada.')

    revalidatePath('/dashboard/certificados')
    revalidatePath('/solicitudes/certificados')
    return {
      error: null,
      success: decision === 'approved' ? 'Certificado aprobado correctamente.' : 'Solicitud rechazada correctamente.',
    }
  } catch (error) {
    return {
      error: getActionErrorMessage(error, 'No se pudo completar la revisión.'),
      success: null,
    }
  }
}

export async function generateAssetClearanceCertificate(
  _previousState: CertificateGenerationActionState,
  formData: FormData
): Promise<CertificateGenerationActionState> {
  try {
    const { supabase, profile } = await getAuthProfile()

    if (!canManageAssetClearanceCertificates(profile.role)) {
      throw new Error('No tiene permisos para emitir certificados.')
    }

    const certificateId = String(formData.get('certificate_id') ?? '').trim()
    if (!certificateId) throw new Error('La solicitud seleccionada no es válida.')

    const { data, error } = await supabase.rpc('generate_asset_clearance_certificate', {
      p_certificate_id: certificateId,
    })

    if (error) throw new Error(error.message)
    if (!Array.isArray(data) || data.length !== 1 || !data[0]?.certificate_code) {
      throw new Error('No se pudo confirmar la emisión del certificado.')
    }

    revalidatePath('/dashboard/certificados')
    revalidatePath('/solicitudes/certificados')
    return {
      error: null,
      success: `Certificado ${data[0].certificate_code} generado correctamente.`,
    }
  } catch (error) {
    return {
      error: getActionErrorMessage(error, 'No se pudo generar el certificado.'),
      success: null,
    }
  }
}
