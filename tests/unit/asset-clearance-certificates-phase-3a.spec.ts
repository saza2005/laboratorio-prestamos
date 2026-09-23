import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260922233000_add_asset_clearance_certificate_issuance.sql'
)

test.describe('asset clearance certificates phase 3A migration', () => {
  test('creates a private immutable issuance record without PDF storage', () => {
    const migration = fs.readFileSync(migrationPath, 'utf8')

    expect(migration).toContain('create table public.asset_clearance_certificate_documents')
    expect(migration).toContain('on delete restrict')
    expect(migration).toContain('alter table public.asset_clearance_certificate_documents enable row level security')
    expect(migration).toContain('asset_clearance_certificate_documents_select_active_staff')
    expect(migration).toContain('using (public.is_admin_or_lab_staff())')
    expect(migration).toContain('revoke insert, update, delete, truncate, references, trigger')
    expect(migration).not.toMatch(/\bstorage\.(objects|buckets)\b/i)
    expect(migration).not.toMatch(/pdf_(path|url|content|data|blob)/i)
  })

  test('limits issuance to an active administrative role and rechecks eligibility', () => {
    const migration = fs.readFileSync(migrationPath, 'utf8')

    expect(migration).toContain('create function public.generate_asset_clearance_certificate')
    expect(migration).toContain("perform public.assert_active_role(array['admin', 'lab_staff'])")
    expect(migration).toContain("if v_certificate.status <> 'approved'")
    expect(migration).toContain('public.evaluate_asset_clearance_eligibility_20260922')
    expect(migration).toContain('for update')
    expect(migration).toContain("set search_path = ''")
  })

  test('uses a sequence, immutable snapshot and idempotent generated branch', () => {
    const migration = fs.readFileSync(migrationPath, 'utf8')

    expect(migration).toContain('create sequence public.asset_clearance_certificate_code_seq')
    expect(migration).toContain("nextval('public.asset_clearance_certificate_code_seq')")
    expect(migration).not.toMatch(/max\s*\([^)]*\)\s*\+\s*1/i)
    expect(migration).toContain("if v_certificate.status = 'generated'")
    expect(migration).toContain('content_snapshot')
    expect(migration).toContain("'Universidad de Cuenca'")
    expect(migration).toContain("'Laboratorio de Máquinas'")
    expect(migration).toContain("'Ing. Francisco Sanchez'")
    expect(migration).toContain("'Laboratorista'")
  })

  test('does not alter operational table security or implement file generation', () => {
    const migration = fs.readFileSync(migrationPath, 'utf8')

    expect(migration).not.toMatch(/alter table public\.(loans|loan_items|returns|items)\b/i)
    expect(migration).not.toMatch(/create policy[\s\S]*?on public\.(loans|loan_items|returns|items)\b/i)
    expect(migration).not.toMatch(/delete\s+from/i)
  })
})
