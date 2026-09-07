export function isPasswordLoginEnabled(
  value = process.env.PASSWORD_LOGIN_ENABLED ?? 'false'
): boolean {
  return value === 'true'
}
