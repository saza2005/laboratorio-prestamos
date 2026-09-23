import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs'
import path from 'node:path'
import {
  generateAssetClearanceCertificatePdf,
  parseAssetClearanceDocumentSnapshot,
} from '@/lib/asset-clearance-certificate-pdf'

const snapshot = {
  document_version: '2026.1',
  institution: { name: 'Universidad de Cuenca', laboratory: 'Laboratorio de Máquinas' },
  certificate: {
    id: '82000000-0000-4000-8000-000000000001',
    code: 'LM-2026-000001',
    issued_at: '2026-09-23T00:00:00Z',
    approved_at: '2026-09-22T23:00:00Z',
  },
  applicant: {
    id: '81000000-0000-4000-8000-000000000001',
    full_name: 'María Peña',
    email: 'maria.pena@ucuenca.edu.ec',
    role: 'student',
    career: 'Ingeniería en Telecomunicaciones',
  },
  loan_history: {
    total_loans: 4,
    total_units_loaned: 7,
    distinct_items_used: 3,
    last_loan_at: '2026-08-30T14:00:00Z',
  },
  signatory: { name: 'Ing. Francisco Sanchez', title: 'Laboratorista', signature_method: 'physical' },
}

test('genera un PDF A4 vertical válido exclusivamente desde el snapshot', async () => {
  const parsed = parseAssetClearanceDocumentSnapshot(snapshot)
  const bytes = await generateAssetClearanceCertificatePdf(parsed)
  const document = await PDFDocument.load(bytes)
  const [page] = document.getPages()

  expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-')
  expect(document.getPageCount()).toBe(1)
  expect(page.getWidth()).toBeCloseTo(595.28, 1)
  expect(page.getHeight()).toBeCloseTo(841.89, 1)
  expect(page.getHeight()).toBeGreaterThan(page.getWidth())
})

test('rechaza snapshots incompletos o con código no institucional', () => {
  expect(() => parseAssetClearanceDocumentSnapshot({ ...snapshot, applicant: null })).toThrow()
  expect(() => parseAssetClearanceDocumentSnapshot({
    ...snapshot,
    certificate: { ...snapshot.certificate, code: 'CERT-1' },
  })).toThrow('El código del certificado no es válido.')
})

test('protege emisión y lectura PDF en servidor sin exponer controles al portal', () => {
  const root = process.cwd()
  const action = fs.readFileSync(path.join(root, 'app/dashboard/certificados/actions.ts'), 'utf8')
  const route = fs.readFileSync(path.join(root, 'app/dashboard/certificados/[id]/pdf/route.ts'), 'utf8')
  const adminUi = fs.readFileSync(path.join(root, 'app/dashboard/certificados/certificate-requests-table.tsx'), 'utf8')
  const portal = fs.readFileSync(path.join(root, 'app/solicitudes/certificados/page.tsx'), 'utf8')

  expect(action).toContain('canManageAssetClearanceCertificates(profile.role)')
  expect(action).toContain(".rpc('generate_asset_clearance_certificate'")
  expect(route).toContain('canManageAssetClearanceCertificates(auth.profile.role)')
  expect(route).toContain(".from('asset_clearance_certificate_documents')")
  expect(route).toContain("'Cache-Control': 'private, no-store, max-age=0'")
  expect(adminUi).toContain('Generar certificado')
  expect(adminUi).toContain('Ver PDF')
  expect(adminUi).toContain('Imprimir')
  expect(portal).not.toContain('/pdf')
  expect(portal).not.toContain('Generar certificado')
})

test('no incorpora Storage ni vuelve a consultar datos operativos para renderizar', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'app/dashboard/certificados/[id]/pdf/route.ts'),
    'utf8'
  )

  expect(source).not.toMatch(/storage\./i)
  expect(source).not.toMatch(/from\('(loans|loan_items|profiles|items)'\)/)
  expect(source).toContain('data.content_snapshot')
})
