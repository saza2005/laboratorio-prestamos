import { expect, test } from '@playwright/test'
import {
  hasPasswordIdentity,
  validatePasswordChange,
} from '../../lib/supabase/auth/password-change'

test.describe('Cambio de contraseña local', () => {
  test('solo habilita cuentas que conservan una identidad email', () => {
    expect(hasPasswordIdentity([{ provider: 'email' }])).toBe(true)
    expect(
      hasPasswordIdentity([{ provider: 'email' }, { provider: 'google' }])
    ).toBe(true)
    expect(hasPasswordIdentity([{ provider: 'google' }])).toBe(false)
    expect(hasPasswordIdentity(undefined)).toBe(false)
  })

  test('acepta una contraseña nueva válida y diferente', () => {
    expect(
      validatePasswordChange({
        currentPassword: 'actual-segura',
        newPassword: 'nueva-segura-2026',
        confirmPassword: 'nueva-segura-2026',
      })
    ).toBeNull()
  })

  test('rechaza campos incompletos, contraseñas cortas y confirmaciones distintas', () => {
    expect(
      validatePasswordChange({
        currentPassword: '',
        newPassword: 'nueva-segura-2026',
        confirmPassword: 'nueva-segura-2026',
      })
    ).toBe('Complete todos los campos.')

    expect(
      validatePasswordChange({
        currentPassword: 'actual-segura',
        newPassword: 'corta',
        confirmPassword: 'corta',
      })
    ).toBe('La nueva contraseña debe tener al menos 8 caracteres.')

    expect(
      validatePasswordChange({
        currentPassword: 'actual-segura',
        newPassword: 'nueva-segura-2026',
        confirmPassword: 'otra-segura-2026',
      })
    ).toBe('La confirmación no coincide con la nueva contraseña.')
  })

  test('rechaza reutilizar la contraseña actual', () => {
    expect(
      validatePasswordChange({
        currentPassword: 'misma-segura-2026',
        newPassword: 'misma-segura-2026',
        confirmPassword: 'misma-segura-2026',
      })
    ).toBe('La nueva contraseña debe ser diferente de la actual.')
  })
})
