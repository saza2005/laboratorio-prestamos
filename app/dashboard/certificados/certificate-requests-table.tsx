'use client'

import { useActionState, useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import {
  certificateStatusBadgeClass,
  formatCertificateStatus,
  getEligibilityBlockerLabels,
  parseEligibilitySnapshot,
  type AssetClearanceCertificateStatus,
} from '@/lib/asset-clearance-certificates'
import { formatDateTime } from '@/lib/format-date'
import { formatUserRole } from '@/lib/status-format'
import { reviewAssetClearanceCertificate } from './actions'

export type CertificateRequestRow = {
  id: string
  status: AssetClearanceCertificateStatus
  requested_at: string
  reviewed_at: string | null
  approved_at: string | null
  generated_at: string | null
  certificate_code: string | null
  observations: string | null
  rejection_reason: string | null
  evaluation_snapshot: unknown
  signatory_name: string
  signatory_title: string
  applicant: {
    id: string
    full_name: string
    email: string
    role: string
    career: string | null
  } | null
  reviewer: { full_name: string; email: string } | null
}

function ReviewForm({ certificateId }: { certificateId: string }) {
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [state, action, pending] = useActionState(reviewAssetClearanceCertificate, {
    error: null,
    success: null,
  })

  return (
    <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="certificate_id" value={certificateId} />
      <div>
        <label htmlFor={`decision-${certificateId}`} className="form-label">Decisión</label>
        <select id={`decision-${certificateId}`} name="decision" value={decision} onChange={(event) => setDecision(event.target.value as 'approved' | 'rejected')} className="form-control mt-1" disabled={pending}>
          <option value="approved">Aprobar solicitud</option>
          <option value="rejected">Rechazar solicitud</option>
        </select>
      </div>
      <div>
        <label htmlFor={`observations-${certificateId}`} className="form-label">Observaciones</label>
        <textarea id={`observations-${certificateId}`} name="observations" rows={3} className="form-control mt-1" placeholder="Observaciones internas o información para el solicitante" disabled={pending} />
      </div>
      {decision === 'rejected' && (
        <div>
          <label htmlFor={`reason-${certificateId}`} className="form-label">Motivo del rechazo</label>
          <textarea id={`reason-${certificateId}`} name="rejection_reason" rows={3} required className="form-control mt-1" placeholder="Explique por qué no puede emitirse el certificado" disabled={pending} />
        </div>
      )}
      <button type="submit" className={decision === 'approved' ? 'button-primary' : 'button-danger'} disabled={pending}>
        {pending ? 'Procesando...' : decision === 'approved' ? 'Aprobar' : 'Rechazar'}
      </button>
      <div aria-live="polite">
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      </div>
    </form>
  )
}

export function CertificateRequestsTable({ certificates }: { certificates: CertificateRequestRow[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const normalizedSearch = search.trim().toLocaleLowerCase('es')
  const filtered = useMemo(() => certificates.filter((certificate) => {
    const userText = `${certificate.applicant?.full_name ?? ''} ${certificate.applicant?.email ?? ''}`.toLocaleLowerCase('es')
    return (!normalizedSearch || userText.includes(normalizedSearch)) && (!status || certificate.status === status)
  }), [certificates, normalizedSearch, status])
  const selected = certificates.find((certificate) => certificate.id === selectedId) ?? null

  return (
    <div className="space-y-4">
      <div className="surface-card grid gap-3 p-4 md:grid-cols-[minmax(260px,1fr)_200px_auto]">
        <div>
          <label htmlFor="certificate-search" className="sr-only">Buscar por usuario</label>
          <input id="certificate-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="form-control" placeholder="Buscar por nombre o correo" />
        </div>
        <div>
          <label htmlFor="certificate-status" className="sr-only">Filtrar por estado</label>
          <select id="certificate-status" value={status} onChange={(event) => setStatus(event.target.value)} className="form-control">
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
            <option value="generated">Generados</option>
          </select>
        </div>
        <button type="button" className="button-secondary" onClick={() => { setSearch(''); setStatus('') }} disabled={!search && !status}>Limpiar</button>
        <p className="text-sm text-slate-500 md:col-span-3">Resultados: {filtered.length} de {certificates.length}</p>
      </div>

      <section className="surface-card overflow-hidden" aria-label="Solicitudes de certificados">
        <div className="hidden grid-cols-[170px_minmax(0,1fr)_130px_150px] gap-4 border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-semibold uppercase text-slate-600 md:grid">
          <span>Fecha</span><span>Solicitante</span><span>Rol</span><span>Estado</span>
        </div>
        {filtered.length > 0 ? <div className="divide-y divide-slate-200">{filtered.map((certificate) => (
          <button key={certificate.id} type="button" onClick={() => setSelectedId(certificate.id)} className="grid w-full gap-2 px-5 py-4 text-left text-sm transition hover:bg-slate-50 md:grid-cols-[170px_minmax(0,1fr)_130px_150px] md:items-center md:gap-4">
            <span className="text-slate-500">{formatDateTime(certificate.requested_at)}</span>
            <span className="min-w-0"><strong className="block truncate text-slate-900">{certificate.applicant?.full_name || 'Sin nombre'}</strong><span className="block truncate text-xs text-slate-500">{certificate.applicant?.email || '-'}</span></span>
            <span className="text-slate-600">{formatUserRole(certificate.applicant?.role)}</span>
            <span><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${certificateStatusBadgeClass(certificate.status)}`}>{formatCertificateStatus(certificate.status)}</span></span>
          </button>
        ))}</div> : <p className="px-5 py-10 text-center text-sm text-slate-500">No existen solicitudes que coincidan con los filtros.</p>}
      </section>

      <DetailDrawer isOpen={Boolean(selected)} onClose={() => setSelectedId(null)} maxWidthClassName="max-w-2xl">
        {selected && (() => {
          const snapshot = parseEligibilitySnapshot(selected.evaluation_snapshot)
          const blockers = getEligibilityBlockerLabels(snapshot)
          return <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Revisión</p><h2 className="mt-1 text-xl font-bold text-slate-950">Solicitud de certificado</h2></div>
              <button type="button" className="button-quiet" onClick={() => setSelectedId(null)}>Cerrar</button>
            </div>
            <section className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
              <div><p className="text-xs font-semibold uppercase text-slate-400">Solicitante</p><p className="mt-1 font-semibold text-slate-900">{selected.applicant?.full_name || 'Sin nombre'}</p><p className="text-sm text-slate-500">{selected.applicant?.email || '-'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-400">Perfil</p><p className="mt-1 text-sm text-slate-700">{formatUserRole(selected.applicant?.role)}</p><p className="text-sm text-slate-500">{selected.applicant?.career || 'Carrera no registrada'}</p></div>
            </section>
            <section className={`rounded-xl border p-4 ${snapshot.eligible ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <h3 className="font-semibold text-slate-900">Resultado de evaluación</h3>
              {snapshot.eligible ? <p className="mt-2 text-sm text-emerald-800">No se detectaron obligaciones de bienes al realizar la evaluación.</p> : <><p className="mt-2 text-sm text-amber-900">Se detectaron condiciones que impiden aprobar el certificado:</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></>}
              {snapshot.blockers.damaged_units_require_manual_review && <p className="mt-3 text-sm font-medium text-amber-900">Los daños registrados requieren revisión manual del laboratorista.</p>}
              {snapshot.checked_at && <p className="mt-3 text-xs text-slate-500">Evaluado: {formatDateTime(snapshot.checked_at)}</p>}
            </section>
            {(selected.observations || selected.rejection_reason) && <section className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">Observaciones</h3>{selected.observations && <p className="mt-2 text-sm text-slate-600">{selected.observations}</p>}{selected.rejection_reason && <p className="mt-2 text-sm text-red-700">Motivo de rechazo: {selected.rejection_reason}</p>}</section>}
            {selected.status === 'pending' ? <ReviewForm key={selected.id} certificateId={selected.id} /> : <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">Esta solicitud ya fue revisada. No hay acciones administrativas pendientes.</p>}
          </div>
        })()}
      </DetailDrawer>
    </div>
  )
}
