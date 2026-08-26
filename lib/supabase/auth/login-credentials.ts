import { normalizeEmail } from './email-policy'

export function parseLoginCredentials(formData: FormData) {
  const emailValue = formData.get('email')
  const passwordValue = formData.get('password')

  return {
    email: typeof emailValue === 'string' ? normalizeEmail(emailValue) : '',
    password: typeof passwordValue === 'string' ? passwordValue : '',
  }
}
