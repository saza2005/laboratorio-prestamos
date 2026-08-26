import { expect, test } from '@playwright/test'
import { parseLoginCredentials } from '../../lib/supabase/auth/login-credentials'

test.describe('Credenciales de inicio de sesión', () => {
  test('normaliza espacios y mayúsculas del correo', () => {
    const formData = new FormData()
    formData.set('email', '  Usuario@UCUENCA.EDU.EC  ')
    formData.set('password', 'secreta')

    expect(parseLoginCredentials(formData)).toEqual({
      email: 'usuario@ucuenca.edu.ec',
      password: 'secreta',
    })
  })

  test('preserva exactamente la contraseña, incluidos espacios externos', () => {
    const formData = new FormData()
    formData.set('email', 'usuario@ucuenca.edu.ec')
    formData.set('password', ' contraseña con espacios ')

    expect(parseLoginCredentials(formData).password).toBe(
      ' contraseña con espacios '
    )
  })

  test('devuelve valores vacíos cuando faltan campos o no son texto', () => {
    expect(parseLoginCredentials(new FormData())).toEqual({
      email: '',
      password: '',
    })

    const formData = new FormData()
    formData.set('email', new Blob(['contenido']))
    formData.set('password', new Blob(['contenido']))
    expect(parseLoginCredentials(formData)).toEqual({
      email: '',
      password: '',
    })
  })
})
