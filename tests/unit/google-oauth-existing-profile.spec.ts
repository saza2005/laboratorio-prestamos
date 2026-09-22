import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260922120000_fix_google_oauth_existing_profile_link.sql'
  ),
  'utf8'
)

test.describe('Vinculación segura de perfiles existentes con Google OAuth', () => {
  test('deriva la identidad desde Auth y exige correo Google confirmado', () => {
    expect(migration).toContain('v_user_id uuid := auth.uid();')
    expect(migration).toContain('from auth.users as auth_user')
    expect(migration).toContain('auth_user.email_confirmed_at is not null')
    expect(migration).toContain('from auth.identities as identity')
    expect(migration).toContain("identity.provider = 'google'")
    expect(migration).toContain("identity.identity_data ->> 'email_verified'")
    expect(migration).toContain('@ucuenca[.]edu[.]ec$')
  })

  test('no depende del proveedor primario histórico de la cuenta', () => {
    expect(migration).not.toContain("app_metadata' ->> 'provider'")
    expect(migration).not.toContain("raw_app_meta_data")
  })

  test('conserva perfil, rol y estado cuando el UUID ya coincide', () => {
    expect(migration).toMatch(
      /where profile\.id = v_user_id[\s\S]*?profile_role := v_existing_role::text[\s\S]*?return next;/
    )
    expect(migration).not.toMatch(/update public\.profiles[\s\S]*?set[\s\S]*?role/)
    expect(migration).not.toMatch(/update public\.profiles[\s\S]*?is_active/)
  })

  test('bloquea una colisión real de correo con otro UUID', () => {
    expect(migration).toMatch(
      /where lower\(profile\.email\) = v_auth_email[\s\S]*?profile\.id <> v_user_id/
    )
    expect(migration).toContain(
      'El correo institucional ya está vinculado a otro perfil.'
    )
    expect(migration).not.toMatch(/update public\.profiles[\s\S]*?id = v_user_id/)
  })

  test('las altas nuevas son idempotentes y nacen únicamente como student activo', () => {
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock')
    expect(migration).toContain("'student'::public.user_role")
    expect(migration).toMatch(/'student'::public\.user_role,\s*true/)
    expect(migration).toContain('on conflict (id) do nothing;')
  })

  test('mantiene mínimos privilegios y no habilita acceso anónimo', () => {
    expect(migration).toContain('security definer')
    expect(migration).toContain("set search_path = ''")
    expect(migration).toContain(
      'revoke all on function public.ensure_google_institutional_profile() from public, anon, service_role;'
    )
    expect(migration).toContain(
      'grant execute on function public.ensure_google_institutional_profile() to authenticated;'
    )
  })
})

test('el callback registra solo código técnico y conserva la redirección segura', () => {
  const callback = readFileSync(
    join(process.cwd(), 'app/auth/callback/route.ts'),
    'utf8'
  )

  expect(callback).toContain('Google profile assurance failed')
  expect(callback).toContain("code: ensureProfileError.code ?? 'unknown'")
  expect(callback).not.toContain('ensureProfileError.message')
  expect(callback).toContain('error=google_link_required')
})
