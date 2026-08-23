import { expect, test } from '@playwright/test'
import { normalizeUserSearch } from '@/app/dashboard/usuarios/search'

test.describe('Normalización de búsqueda de usuarios', () => {
  test('mantiene un término normal', () => {
    expect(normalizeUserSearch('María Pérez')).toBe('María Pérez')
  })

  test('conserva el signo más en un email', () => {
    expect(normalizeUserSearch('persona+student@example.com')).toBe(
      'persona+student@example.com'
    )
  })

  test('conserva mayúsculas y minúsculas porque la consulta usa ilike', () => {
    expect(normalizeUserSearch('Persona+Tag@Example.COM')).toBe(
      'Persona+Tag@Example.COM'
    )
  })

  test('elimina únicamente espacios externos', () => {
    expect(normalizeUserSearch('  persona+tag@example.com  ')).toBe(
      'persona+tag@example.com'
    )
  })

  test('no altera innecesariamente un email válido', () => {
    const email = 'nombre.apellido+laboratorio@example.edu'
    expect(normalizeUserSearch(email)).toBe(email)
  })
})
