import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import {
  certificateStatusBadgeClass,
  formatCertificateStatus,
  getEligibilityBlockerLabels,
  parseEligibilitySnapshot,
} from '../../lib/asset-clearance-certificates'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')
const shell = read('components/app-shell.tsx')
const portalPage = read('app/solicitudes/certificados/page.tsx')
const portalAction = read('app/solicitudes/certificados/actions.ts')
const adminPage = read('app/dashboard/certificados/page.tsx')
const adminTable = read('app/dashboard/certificados/certificate-requests-table.tsx')
const adminAction = read('app/dashboard/certificados/actions.ts')

test.describe('Interfaz de certificados de no adeudo — fase 2', () => {
  test('incorpora navegación separada para portal y administración', () => {
    expect(shell).toContain("href: '/dashboard/certificados'")
    expect(shell).toContain("href: '/solicitudes/certificados'")
    expect(shell.match(/label: 'Certificados'/g)).toHaveLength(2)
  })

  test('el portal solo solicita y consulta certificados propios', () => {
    expect(portalPage).toContain(".eq('applicant_id', user.id)")
    expect(portalPage).toContain('CertificateRequestButton')
    expect(portalPage).not.toMatch(/reviewAssetClearanceCertificate|Aprobar|Rechazar/)
    expect(portalAction).toContain("canRequestAssetClearanceCertificate(profile.role)")
    expect(portalAction).toContain(".rpc('request_asset_clearance_certificate')")
    expect(portalAction).not.toMatch(/\.from\([^)]*\)\s*\.(insert|update|delete)/)
  })

  test('la vista administrativa exige rol operativo y usa la RPC de revisión', () => {
    expect(adminPage).toContain('canManageAssetClearanceCertificates(profile.role)')
    expect(adminPage).toContain(".from('asset_clearance_certificates')")
    expect(adminTable).toContain('Resultado de evaluación')
    expect(adminTable).toContain("selected.status === 'pending'")
    expect(adminAction).toContain('canManageAssetClearanceCertificates(profile.role)')
    expect(adminAction).toContain(".rpc('review_asset_clearance_certificate'")
    expect(adminAction).not.toMatch(/\.from\([^)]*\)\s*\.(insert|update|delete)/)
  })

  test('no expone generación, impresión o descarga de PDF', () => {
    const phaseTwoSources = `${portalPage}\n${adminPage}\n${adminTable}\n${portalAction}\n${adminAction}`
    expect(phaseTwoSources).not.toMatch(/generar pdf|imprimir|descargar pdf|application\/pdf/i)
  })

  test('normaliza estados y snapshots sin confiar en estructuras desconocidas', () => {
    expect(formatCertificateStatus('pending')).toBe('Pendiente')
    expect(formatCertificateStatus('approved')).toBe('Aprobado')
    expect(formatCertificateStatus('rejected')).toBe('Rechazado')
    expect(formatCertificateStatus('generated')).toBe('Generado')
    expect(certificateStatusBadgeClass('unknown')).toContain('slate')

    const invalid = parseEligibilitySnapshot(null)
    expect(invalid.eligible).toBe(false)
    expect(getEligibilityBlockerLabels(invalid)).toEqual([])

    const blocked = parseEligibilitySnapshot({
      eligible: false,
      blockers: { active_loans: 1, damaged_units: 2, damaged_units_require_manual_review: true },
    })
    expect(getEligibilityBlockerLabels(blocked)).toEqual([
      'Préstamos activos: 1',
      'Unidades dañadas: 2',
    ])
    expect(blocked.blockers.damaged_units_require_manual_review).toBe(true)
  })

  test('el panel de revisión conserva semántica y validación accesible', () => {
    expect(adminTable).toContain('<DetailDrawer')
    expect(adminTable).toContain('aria-live="polite"')
    expect(adminTable).toContain('htmlFor={`decision-${certificateId}`}')
    expect(adminTable).toContain('htmlFor={`reason-${certificateId}`}')
    expect(adminTable).toContain('required className="form-control mt-1"')
    expect(adminTable).toContain('type="search"')
  })

  test('presenta textos claros y distingue estados vacíos administrativos', () => {
    const requestButton = read('app/solicitudes/certificados/certificate-request-button.tsx')
    expect(requestButton).toContain('Solicitar certificado de no adeudo')
    expect(portalPage).toContain('Mis certificados')
    expect(portalPage).toContain('Historial de solicitudes de certificados.')
    expect(adminPage).toContain('Gestiona las solicitudes de certificados')
    expect(adminPage).toContain('label="Emitidos"')
    expect(adminPage).not.toContain('PDF no disponible en esta fase')
    expect(adminTable).toContain('<span>Acción</span>')
    expect(adminTable).toContain('No existen solicitudes de certificados registradas.')
    expect(adminTable).toContain('No existen solicitudes que coincidan con los filtros seleccionados.')
  })
})
