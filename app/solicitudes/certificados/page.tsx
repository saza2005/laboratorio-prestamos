import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import {
  certificateStatusBadgeClass,
  formatCertificateStatus,
} from '@/lib/asset-clearance-certificates'
import { formatDateTime } from '@/lib/format-date'
import { USER_CERTIFICATES_LIMIT } from '@/lib/query-limits'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import {
  canRequestAssetClearanceCertificate,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'
import { CertificateRequestButton } from './certificate-request-button'

export default async function OwnCertificatesPage() {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canRequestAssetClearanceCertificate(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

  const { data: certificates, error } = await supabase
    .from('asset_clearance_certificates')
    .select('id, status, requested_at, reviewed_at, approved_at, generated_at, certificate_code, observations, rejection_reason, signatory_name, signatory_title')
    .eq('applicant_id', user.id)
    .order('requested_at', { ascending: false })
    .limit(USER_CERTIFICATES_LIMIT)

  if (error) throw new Error('No se pudieron cargar sus solicitudes de certificado.')

  const hasOpenRequest = (certificates ?? []).some(
    (certificate) => certificate.status === 'pending' || certificate.status === 'approved'
  )

  return (
    <main className="app-page">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          eyebrow="Trámites"
          title="Certificados de no adeudo"
          description="Solicita la revisión de tus obligaciones de bienes con el laboratorio y consulta el estado del trámite."
        />

        <section className="surface-card grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Solicitud de certificado</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              El personal del laboratorio verificará préstamos activos, devoluciones pendientes, vencimientos, pérdidas y daños. Solo el administrador o laboratorista puede aprobar y emitir el certificado.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              El documento final requiere la firma física de Ing. Francisco Sanchez, Laboratorista.
            </p>
          </div>
          <CertificateRequestButton disabled={hasOpenRequest} />
        </section>

        <section className="surface-card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-950">Mis solicitudes</h2>
            <p className="mt-1 text-sm text-slate-500">Historial de los últimos {USER_CERTIFICATES_LIMIT} trámites.</p>
          </div>
          {(certificates?.length ?? 0) > 0 ? (
            <div className="divide-y divide-slate-200">
              {certificates?.map((certificate) => (
                <article key={certificate.id} className="grid gap-3 px-5 py-4 sm:px-6 md:grid-cols-[180px_130px_minmax(0,1fr)] md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Solicitado</p>
                    <p className="mt-1 text-sm text-slate-700">{formatDateTime(certificate.requested_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</p>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${certificateStatusBadgeClass(certificate.status)}`}>
                      {formatCertificateStatus(certificate.status)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Detalle</p>
                    {certificate.status === 'rejected' ? (
                      <p className="mt-1 text-sm text-red-700">{certificate.rejection_reason || 'Solicitud rechazada por el personal del laboratorio.'}</p>
                    ) : certificate.status === 'approved' ? (
                      <p className="mt-1 text-sm text-blue-700">Aprobado para la futura emisión del documento.</p>
                    ) : certificate.status === 'generated' ? (
                      <p className="mt-1 text-sm text-emerald-700">Código: {certificate.certificate_code || 'Pendiente de consulta'}</p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-600">Pendiente de revisión administrativa.</p>
                    )}
                    {certificate.observations && <p className="mt-2 text-sm text-slate-500">Observación: {certificate.observations}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <p className="font-medium text-slate-700">Aún no tiene solicitudes de certificado.</p>
              <p className="mt-1 text-sm text-slate-500">Use el botón superior para iniciar el trámite.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
