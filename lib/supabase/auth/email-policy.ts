export const INSTITUTIONAL_EMAIL_DOMAIN = 'ucuenca.edu.ec'

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function isInstitutionalEmail(email: string) {
  return /^[^\s@]+@ucuenca\.edu\.ec$/i.test(email.trim())
}
