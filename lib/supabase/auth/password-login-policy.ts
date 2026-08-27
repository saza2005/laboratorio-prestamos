export function isPasswordLoginEnabled(
  value = process.env.PASSWORD_LOGIN_ENABLED
): boolean {
  return value === 'true'
}
