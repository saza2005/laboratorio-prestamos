export function isPasswordLoginEnabled(
  value = process.env.PASSWORD_LOGIN_ENABLED ?? 'true'
): boolean {
  return value === 'true'
}
