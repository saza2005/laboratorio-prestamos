import { expect, test } from '@playwright/test'
import { filterProfilesForSelection } from '@/lib/profile-search'

const profiles = [
  {
    id: 'student-1',
    full_name: 'María Estudiante',
    email: 'maria+laboratorio@example.com',
  },
  {
    id: 'student-2',
    full_name: 'Carlos Andrade',
    email: 'carlos@example.com',
  },
]

test.describe('Filtro de perfiles para selección', () => {
  test('busca por nombre exacto o parcial sin distinguir mayúsculas', () => {
    expect(filterProfilesForSelection(profiles, 'MARÍA')).toEqual([profiles[0]])
    expect(filterProfilesForSelection(profiles, 'and')).toEqual([profiles[1]])
  })

  test('busca por correo y conserva el signo más', () => {
    expect(
      filterProfilesForSelection(profiles, 'maria+laboratorio@example.com')
    ).toEqual([profiles[0]])
  })

  test('devuelve todos los perfiles con búsqueda vacía', () => {
    expect(filterProfilesForSelection(profiles, '   ')).toEqual(profiles)
  })

  test('devuelve una lista vacía cuando no hay resultados', () => {
    expect(filterProfilesForSelection(profiles, 'sin coincidencias')).toEqual([])
  })

  test('mantiene visible el perfil seleccionado aunque no coincida', () => {
    expect(
      filterProfilesForSelection(profiles, 'Carlos', 'student-1')
    ).toEqual([profiles[0], profiles[1]])
  })
})
