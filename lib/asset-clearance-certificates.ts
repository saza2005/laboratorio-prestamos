export type AssetClearanceCertificateStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'generated'

export type EligibilityBlockers = {
  active_loans: number
  partial_returns: number
  overdue_loans: number
  pending_items: number
  missing_units: number
  damaged_units: number
  damaged_units_require_manual_review: boolean
}

export type EligibilitySnapshot = {
  eligible: boolean
  checked_at?: string
  rule_version?: string
  blockers: EligibilityBlockers
}

const EMPTY_BLOCKERS: EligibilityBlockers = {
  active_loans: 0,
  partial_returns: 0,
  overdue_loans: 0,
  pending_items: 0,
  missing_units: 0,
  damaged_units: 0,
  damaged_units_require_manual_review: false,
}

export function formatCertificateStatus(status: string | null | undefined) {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'approved': return 'Aprobado'
    case 'rejected': return 'Rechazado'
    case 'generated': return 'Generado'
    default: return status ?? '-'
  }
}

export function certificateStatusBadgeClass(status: string | null | undefined) {
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'approved': return 'bg-blue-50 text-blue-700 ring-blue-200'
    case 'rejected': return 'bg-red-50 text-red-700 ring-red-200'
    case 'generated': return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    default: return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function parseEligibilitySnapshot(value: unknown): EligibilitySnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { eligible: false, blockers: EMPTY_BLOCKERS }
  }

  const snapshot = value as Record<string, unknown>
  const rawBlockers = snapshot.blockers && typeof snapshot.blockers === 'object' && !Array.isArray(snapshot.blockers)
    ? snapshot.blockers as Record<string, unknown>
    : {}
  const numberValue = (key: keyof EligibilityBlockers) => {
    const parsed = Number(rawBlockers[key])
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }

  return {
    eligible: snapshot.eligible === true,
    checked_at: typeof snapshot.checked_at === 'string' ? snapshot.checked_at : undefined,
    rule_version: typeof snapshot.rule_version === 'string' ? snapshot.rule_version : undefined,
    blockers: {
      active_loans: numberValue('active_loans'),
      partial_returns: numberValue('partial_returns'),
      overdue_loans: numberValue('overdue_loans'),
      pending_items: numberValue('pending_items'),
      missing_units: numberValue('missing_units'),
      damaged_units: numberValue('damaged_units'),
      damaged_units_require_manual_review: rawBlockers.damaged_units_require_manual_review === true,
    },
  }
}

export function getEligibilityBlockerLabels(snapshot: EligibilitySnapshot) {
  const blockers = snapshot.blockers
  return [
    blockers.active_loans > 0 ? `Préstamos activos: ${blockers.active_loans}` : null,
    blockers.partial_returns > 0 ? `Devoluciones parciales: ${blockers.partial_returns}` : null,
    blockers.overdue_loans > 0 ? `Préstamos vencidos: ${blockers.overdue_loans}` : null,
    blockers.pending_items > 0 ? `Bienes pendientes: ${blockers.pending_items}` : null,
    blockers.missing_units > 0 ? `Unidades perdidas: ${blockers.missing_units}` : null,
    blockers.damaged_units > 0 ? `Unidades dañadas: ${blockers.damaged_units}` : null,
  ].filter((label): label is string => Boolean(label))
}
