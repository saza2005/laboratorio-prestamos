import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260922230000_add_asset_clearance_certificates_phase_1.sql'
  ),
  'utf8'
)

test.describe('Certificados de no adeudo — fase 1', () => {
  test('crea la entidad y los cuatro estados definidos sin implementar PDF', () => {
    expect(migration).toContain('create table public.asset_clearance_certificates')
    for (const status of ['pending', 'approved', 'rejected', 'generated']) {
      expect(migration).toContain(`'${status}'`)
    }
    expect(migration).toContain("default 'Ing. Francisco Sanchez'")
    expect(migration).toContain("default 'Laboratorista'")
    expect(migration).not.toContain('pdf_document')
    expect(migration).not.toContain('pdf_storage_path')
  })

  test('evalúa cada impedimento definido antes de aprobar', () => {
    for (const blocker of [
      'active_loans',
      'partial_returns',
      'overdue_loans',
      'pending_items',
      'missing_units',
      'damaged_units',
    ]) {
      expect(migration).toContain(`'${blocker}'`)
    }
    expect(migration).toContain("loan.status in ('active', 'partial_return')")
    expect(migration).toContain('loan.expected_return_date < v_today')
    expect(migration).toContain('> coalesce(loan_item.returned_quantity, 0) + coalesce(loan_item.missing_quantity, 0)')
    expect(migration).toContain("v_snapshot ->> 'eligible'")
  })

  test('limita solicitud a student/teacher y revisión a personal operativo', () => {
    expect(migration).toContain("perform public.assert_active_role(array['student', 'teacher']);")
    expect(migration).toContain("perform public.assert_active_role(array['admin', 'lab_staff']);")
    expect(migration).toContain('applicant_id = auth.uid()')
    expect(migration).toContain('public.is_admin_or_lab_staff()')
  })

  test('impide escrituras directas y expone únicamente las RPC públicas necesarias', () => {
    expect(migration).toMatch(/revoke all on table public\.asset_clearance_certificates from public, anon;/)
    expect(migration).toMatch(/revoke insert, update, delete, truncate, references, trigger[\s\S]*?from authenticated;/)
    expect(migration).toContain('grant select on table public.asset_clearance_certificates to authenticated;')
    expect(migration).toContain('grant execute on function public.request_asset_clearance_certificate()')
    expect(migration).toContain('grant execute on function public.review_asset_clearance_certificate(uuid, text, text, text)')
    expect(migration).toMatch(/revoke all on function public\.evaluate_asset_clearance_eligibility_20260922\(uuid\)[\s\S]*?authenticated/)
  })

  test('usa funciones SECURITY DEFINER con search_path estricto y evita solicitudes abiertas duplicadas', () => {
    const functions = [
      'evaluate_asset_clearance_eligibility_20260922',
      'request_asset_clearance_certificate',
      'review_asset_clearance_certificate',
    ]

    for (const functionName of functions) {
      const start = migration.indexOf(`function public.${functionName}`)
      expect(start).toBeGreaterThanOrEqual(0)
      expect(migration.slice(start, start + 500)).toContain('security definer')
      expect(migration.slice(start, start + 500)).toContain("set search_path = ''")
    }

    expect(migration).toContain('asset_clearance_certificates_one_open_per_applicant_idx')
    expect(migration).toContain('where status in (\'pending\', \'approved\')')
    expect(migration).toContain('for update;')
  })
})
