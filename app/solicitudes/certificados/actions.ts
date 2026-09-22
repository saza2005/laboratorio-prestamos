'use server'

import { revalidatePath } from 'next/cache'
import { getActionErrorMessage } from '@/lib/action-error'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canRequestAssetClearanceCertificate } from '@/lib/supabase/auth/roles'

export type CertificateRequestActionState = {
  error: string | null
  success: string | null
}

export async function requestAssetClearanceCertificate(
  _previousState: CertificateRequestActionState
): Promise<CertificateRequestActionState> {
  void _previousState

  try {
    const { supabase, profile } = await getAuthProfile()

    if (!canRequestAssetClearanceCertificate(profile.role)) {
      throw new Error('No tiene permisos para solicitar certificados.')
    }

    const { data, error } = await supabase.rpc('request_asset_clearance_certificate')

    if (error) throw new Error(error.message)
    if (!data) throw new Error('No se pudo identificar la solicitud creada.')

    revalidatePath('/solicitudes/certificados')
    revalidatePath('/dashboard/certificados')
    return { error: null, success: 'Solicitud de certificado registrada correctamente.' }
  } catch (error) {
    return {
      error: getActionErrorMessage(error, 'No se pudo solicitar el certificado.'),
      success: null,
    }
  }
}
