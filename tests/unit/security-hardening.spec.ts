import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260910120000_harden_profiles_active_accounts_and_rpcs.sql'
)
const migration = readFileSync(migrationPath, 'utf8')

const operationalRpcs = [
  'approve_request_transaction',
  'create_inventory_item_transaction',
  'create_multi_item_loan_transaction',
  'create_request_transaction',
  'deliver_approved_request_with_units',
  'register_full_return_transaction',
  'register_maintenance_record_transaction',
  'register_return_transaction',
  'reject_request_transaction',
  'update_item_unit_status_transaction',
]

test.describe('Migración de endurecimiento de seguridad', () => {
  test('elimina la escritura directa del perfil y el alta siempre nace como student activo', () => {
    expect(migration).toContain(
      'drop policy if exists profiles_insert_own on public.profiles;'
    )
    expect(migration).toContain(
      'revoke insert, update, delete on public.profiles from authenticated;'
    )
    expect(migration).toContain("'student'::public.user_role")
    expect(migration).toMatch(/insert into public\.profiles[\s\S]*?true[\s\S]*?returning role::text/)
    expect(migration).not.toMatch(/insert into public\.profiles[\s\S]*?p_role/)
  })

  test('el alta institucional deriva identidad de auth y no acepta parámetros privilegiados', () => {
    expect(migration).toContain('v_user_id uuid := auth.uid();')
    expect(migration).toContain("auth.jwt() ->> 'email'")
    expect(migration).toContain("-> 'app_metadata' ->> 'provider', '') <> 'google'")
    expect(migration).toContain('@ucuenca[.]edu[.]ec$')
    expect(migration).toContain(
      'create or replace function public.ensure_google_institutional_profile()'
    )
    expect(migration).not.toContain(
      'ensure_google_institutional_profile(p_role'
    )
  })

  test('los helpers de roles exigen perfil activo y search_path estricto', () => {
    for (const helper of [
      'is_active_user',
      'is_admin_or_lab_staff',
      'is_teacher',
      'get_my_role',
      'assert_active_role',
    ]) {
      const start = migration.indexOf(`function public.${helper}`)
      expect(start, `${helper} debe existir`).toBeGreaterThanOrEqual(0)
      const body = migration.slice(start, start + 900)
      expect(body).toContain("set search_path = ''")
      expect(body).toContain('is_active is true')
    }
  })

  test('toda RPC operacional queda detrás de la guardia de cuenta activa', () => {
    for (const rpc of operationalRpcs) {
      expect(migration).toContain(
        `rename to ${rpc}_security_impl_20260910;`
      )

      const wrapperStart = migration.indexOf(`create function public.${rpc}(`)
      expect(wrapperStart, `${rpc} debe conservar wrapper público`).toBeGreaterThanOrEqual(0)
      const wrapper = migration.slice(wrapperStart, wrapperStart + 1800)
      expect(wrapper).toContain("set search_path = ''")
      expect(wrapper).toContain('perform public.assert_active_role(')
    }
  })

  test('las implementaciones internas y RPC heredadas no son ejecutables por clientes', () => {
    for (const rpc of operationalRpcs) {
      expect(migration).toContain(
        `revoke all on function public.${rpc}_security_impl_20260910`
      )
    }

    for (const legacyRpc of [
      'create_loan_transaction',
      'create_loan_with_unit_transaction',
      'deliver_approved_request',
      'increment_stock',
      'handle_new_user',
    ]) {
      expect(migration).toMatch(
        new RegExp(`revoke all on function public\\.${legacyRpc}\\(`)
      )
    }
  })

  test('RLS conserva solo el perfil propio como lectura mínima para una cuenta inactiva', () => {
    expect(migration).not.toContain(
      'drop policy if exists profiles_select_own on public.profiles;'
    )
    expect(migration).toMatch(
      /using \([\s\S]*?public\.is_active_user\(\)[\s\S]*?user_id = auth\.uid\(\)[\s\S]*?\);/
    )
    expect(migration).toContain(
      'using (public.is_active_user());'
    )
    expect(migration).toContain('revoke all on table')
    expect(migration).toContain('from anon;')
  })
})

test.describe('Contratos de autorización esperados', () => {
  test('el callback OAuth usa la RPC segura y rechaza perfiles inactivos', () => {
    const callback = readFileSync(
      join(process.cwd(), 'app/auth/callback/route.ts'),
      'utf8'
    )
    const authProfile = readFileSync(
      join(process.cwd(), 'lib/supabase/auth/get-auth-profile.ts'),
      'utf8'
    )

    expect(callback).toContain(".rpc(\n    'ensure_google_institutional_profile'")
    expect(callback).not.toContain(".from('profiles')\n    .insert(")
    expect(callback).toContain(".select('role, is_active')")
    expect(callback).toContain('if (!profile.is_active)')
    expect(authProfile).toContain(".select('id, full_name, email, role, is_active')")
    expect(authProfile).toContain('if (!profile.is_active)')
  })

  test('un usuario no puede autoasignarse admin, lab_staff o teacher por escritura directa', () => {
    for (const role of ['admin', 'lab_staff', 'teacher']) {
      expect(migration).not.toContain(`profiles_insert_own_${role}`)
    }
    expect(migration).toContain(
      'revoke insert, update, delete on public.profiles from authenticated;'
    )
  })

  test('el flujo administrativo conserva cambio de rol solo para admin activo', () => {
    const roleMigration = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260823_admin_update_profile_role.sql'
      ),
      'utf8'
    )

    expect(roleMigration).toContain("v_actor_role::text <> 'admin'")
    expect(roleMigration).toContain('v_actor_active is not true')
    expect(roleMigration).toContain("p_role not in ('student', 'teacher', 'lab_staff')")
    expect(roleMigration).toContain("v_target_role::text = 'admin'")
    expect(roleMigration).toContain("set search_path = ''")
  })

  test('anon pierde acceso a tablas y funciones operacionales', () => {
    expect(migration).toMatch(/revoke all on table[\s\S]*?from anon;/)
    expect(migration).toContain(
      'from public, anon, authenticated, service_role;'
    )
  })
})
