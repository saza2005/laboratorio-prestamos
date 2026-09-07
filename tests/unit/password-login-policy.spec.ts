import { expect, test } from '@playwright/test'
import { isPasswordLoginEnabled } from '@/lib/supabase/auth/password-login-policy'

test.describe('Política de acceso con contraseña', () => {
  test('permanece deshabilitada por defecto', () => {
    expect(isPasswordLoginEnabled(undefined)).toBe(false)
  })

  test('solo se habilita con el valor explícito true', () => {
    expect(isPasswordLoginEnabled('true')).toBe(true)
    expect(isPasswordLoginEnabled('false')).toBe(false)
    expect(isPasswordLoginEnabled('TRUE')).toBe(false)
    expect(isPasswordLoginEnabled('1')).toBe(false)
  })
})
