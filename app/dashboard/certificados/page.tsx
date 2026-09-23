import { redirect } from 'next/navigation'
import { MetricCard } from '@/components/metric-card'
import { PageHeader } from '@/components/page-header'
import { ADMIN_CERTIFICATES_LIMIT } from '@/lib/query-limits'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { firstOrNull } from '@/lib/supabase/query-utils'
import {
  canManageAssetClearanceCertificates,
  getHomeRouteByRole,
} from '@/lib/supabase/auth/roles'
import { CertificateRequestsTable, type CertificateRequestRow } from './certificate-requests-table'

export default async function CertificatesAdminPage() {
  const { supabase, profile } = await getAuthProfile()

  if (!canManageAssetClearanceCertificates(profile.role)) {
    redirect(getHomeRouteByRole(profile.role))
  }

  const { data, error } = await supabase
    .from('asset_clearance_certificates')
    .select(`
      id, status, requested_at, reviewed_at, approved_at, generated_at,
      certificate_code, observations, rejection_reason, evaluation_snapshot,
      signatory_name, signatory_title,
      applicant:profiles!asset_clearance_certificates_applicant_id_fkey(id, full_name, email, role, career),
      reviewer:profiles!asset_clearance_certificates_reviewed_by_fkey(full_name, email)
    `)
    .order('requested_at', { ascending: false })
    .limit(ADMIN_CERTIFICATES_LIMIT)

  if (error) throw new Error('No se pudieron cargar las solicitudes de certificados.')

  const certificates = (data ?? []).map((certificate) => ({
    ...certificate,
    applicant: firstOrNull(certificate.applicant),
    reviewer: firstOrNull(certificate.reviewer),
  })) as CertificateRequestRow[]
  const count = (status: string) => certificates.filter((certificate) => certificate.status === status).length

  return (
    <main className="app-page">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader eyebrow="Administración" title="Certificados de no adeudo" description="Gestiona las solicitudes de certificados y verifica si los usuarios mantienen obligaciones pendientes con el laboratorio." />
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pendientes" value={count('pending')} tone="warning" icon="certificate" />
          <MetricCard label="Aprobados" value={count('approved')} tone="primary" icon="certificate" />
          <MetricCard label="Rechazados" value={count('rejected')} tone="danger" icon="certificate" />
          <MetricCard label="Emitidos" value={count('generated')} tone="success" icon="certificate" />
        </section>
        <CertificateRequestsTable certificates={certificates} />
      </div>
    </main>
  )
}
