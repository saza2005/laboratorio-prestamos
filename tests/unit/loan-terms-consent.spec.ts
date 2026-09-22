import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import {
  LOAN_TERMS_ACCEPTED_VALUE,
  LOAN_TERMS_VERSION,
  isLoanTermsAccepted,
} from '@/lib/loan-terms'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const migration = read(
  'supabase/migrations/20260922160000_add_loan_terms_acceptance.sql'
)

test.describe('Consentimiento de términos del préstamo', () => {
  test('solo acepta el valor explícito emitido por el checkbox', () => {
    expect(isLoanTermsAccepted(LOAN_TERMS_ACCEPTED_VALUE)).toBe(true)
    expect(isLoanTermsAccepted(null)).toBe(false)
    expect(isLoanTermsAccepted('on')).toBe(false)
    expect(isLoanTermsAccepted('true')).toBe(false)
    expect(LOAN_TERMS_VERSION).toBe('2026-09-22-v1')
  })

  test('el componente es reutilizable, obligatorio y abre términos accesibles', () => {
    const component = read('components/terms-acceptance.tsx')

    expect(component).toContain('name={LOAN_TERMS_FIELD}')
    expect(component).toContain('type="checkbox"')
    expect(component).toContain('required')
    expect(component).toContain('showModal()')
    expect(component).toContain('aria-labelledby={titleId}')
    expect(component).toContain('Ver términos y condiciones')
  })

  test('los tres formularios exigen el mismo consentimiento', () => {
    for (const path of [
      'app/solicitudes/request-form.tsx',
      'app/solicitudes/request-form-groups.tsx',
      'app/prestamos/loan-form.tsx',
    ]) {
      const form = read(path)
      expect(form, path).toContain('<TermsAcceptance')
      expect(form, path).toMatch(
        /disabled=\{[^}]*(!termsAccepted|!canSubmit)|const canSubmit =[\s\S]*termsAccepted/
      )
    }
  })

  test('las Server Actions rechazan la omisión y no confían en una versión del cliente', () => {
    for (const path of [
      'app/solicitudes/actions.ts',
      'app/prestamos/actions.ts',
    ]) {
      const action = read(path)
      expect(action, path).toContain("formData.get('terms_accepted')")
      expect(action, path).toContain('if (!termsAccepted)')
      expect(action, path).toContain('p_terms_accepted: true')
      expect(action, path).not.toContain("formData.get('terms_version')")
    }
  })

  test('la migración preserva históricos y exige evidencia completa en nuevos registros', () => {
    expect(migration).toContain('add column if not exists terms_accepted_at timestamptz')
    expect(migration).toContain('add column if not exists terms_version text')
    expect(migration).toContain(
      'add column if not exists terms_accepted_by uuid references public.profiles(id) on delete restrict'
    )
    expect(migration).toContain('requests_terms_acceptance_complete')
    expect(migration).toContain('loans_terms_acceptance_complete')
    expect(migration).not.toMatch(/update public\.(requests|loans)[\s\S]*where terms_accepted_at is null/i)
    expect(migration).not.toMatch(/delete from public\./i)
  })

  test('las RPC rechazan false, fijan versión en servidor y retiran firmas antiguas', () => {
    expect(migration).toContain(
      'drop function if exists public.create_request_transaction(text, text, date, jsonb, jsonb);'
    )
    expect(migration).toContain(
      'drop function if exists public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid);'
    )
    expect(migration.match(/if p_terms_accepted is not true then/g)).toHaveLength(2)
    expect(migration.match(/terms_version = '2026-09-22-v1'/g)).toHaveLength(2)
    expect(migration.match(/terms_accepted_by = auth\.uid\(\)/g)).toHaveLength(2)
    expect(migration).toContain("set search_path = ''")
    expect(migration).toContain('to authenticated;')
  })

  test('la evidencia solo se escribe dentro de las RPC públicas endurecidas', () => {
    const hardening = read(
      'supabase/migrations/20260910120000_harden_profiles_active_accounts_and_rpcs.sql'
    )

    expect(hardening).toMatch(
      /revoke all on table[\s\S]*?public\.loans[\s\S]*?public\.requests[\s\S]*?from authenticated;/
    )
    expect(hardening).toMatch(
      /grant select on table[\s\S]*?public\.loans[\s\S]*?public\.requests[\s\S]*?to authenticated;/
    )
    expect(migration).toContain(
      'revoke all on function public.create_request_transaction_security_impl_20260910'
    )
    expect(migration).toContain(
      'revoke all on function public.create_multi_item_loan_transaction_security_impl_20260910'
    )
  })

  test('no cambia RLS ni roles de aplicación', () => {
    expect(migration).not.toMatch(/create\s+policy/i)
    expect(migration).not.toMatch(/alter\s+policy/i)
    expect(migration).not.toMatch(/drop\s+policy/i)
    expect(migration).not.toMatch(/update\s+public\.profiles/i)
  })
})
