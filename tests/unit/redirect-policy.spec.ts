import { expect, test } from '@playwright/test'
import {
  getSafeAuthNextPath,
  resolveAppOrigin,
} from '../../lib/supabase/auth/redirect-policy'

test.describe('Política de redirecciones de autenticación', () => {
  test('prioriza el origen canónico configurado', () => {
    expect(resolveAppOrigin('https://app.example.edu/', 'https://otro.example')).toBe(
      'https://app.example.edu'
    )
  })

  test('acepta localhost como fallback de desarrollo', () => {
    expect(resolveAppOrigin(null, 'http://localhost:3000')).toBe(
      'http://localhost:3000'
    )
  })

  test('rechaza protocolos y credenciales no válidos', () => {
    expect(() => resolveAppOrigin('javascript:alert(1)', null)).toThrow()
    expect(() => resolveAppOrigin('https://user:pass@example.edu', null)).toThrow()
  })

  test('permite únicamente destinos internos previstos', () => {
    expect(getSafeAuthNextPath('/dashboard', '/solicitudes')).toBe('/dashboard')
    expect(getSafeAuthNextPath('/solicitudes', '/dashboard')).toBe('/solicitudes')
  })

  test('descarta destinos externos, ambiguos o desconocidos', () => {
    expect(getSafeAuthNextPath('https://example.com', '/dashboard')).toBe('/dashboard')
    expect(getSafeAuthNextPath('//example.com', '/dashboard')).toBe('/dashboard')
    expect(getSafeAuthNextPath('/ruta-no-prevista', '/dashboard')).toBe('/dashboard')
  })
})
