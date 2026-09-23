import { NextRequest } from 'next/server'
import {
  generateAssetClearanceCertificatePdf,
  parseAssetClearanceDocumentSnapshot,
} from '@/lib/asset-clearance-certificate-pdf'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageAssetClearanceCertificates } from '@/lib/supabase/auth/roles'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let auth
  try {
    auth = await getAuthProfile()
  } catch {
    return new Response('No autenticado', { status: 401 })
  }

  if (!canManageAssetClearanceCertificates(auth.profile.role)) {
    return new Response('No autorizado', { status: 403 })
  }

  const { id } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return new Response('Certificado no válido', { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('asset_clearance_certificate_documents')
    .select('certificate_id, content_snapshot')
    .eq('certificate_id', id)
    .single()

  if (error || !data) {
    return new Response('Documento no encontrado', { status: 404 })
  }

  try {
    const snapshot = parseAssetClearanceDocumentSnapshot(data.content_snapshot)
    if (snapshot.certificate.id !== id) {
      throw new Error('El documento no coincide con el certificado solicitado.')
    }

    const pdf = await generateAssetClearanceCertificatePdf(snapshot)
    const disposition = request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'
    const filename = `certificado-no-adeudo-${snapshot.certificate.code}.pdf`

    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response('El contenido documental no es válido', { status: 422 })
  }
}
