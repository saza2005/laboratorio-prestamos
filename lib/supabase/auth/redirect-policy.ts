const ALLOWED_AUTH_NEXT_PATHS = new Set(['/dashboard', '/solicitudes'])

export function resolveAppOrigin(
  configuredOrigin?: string | null,
  requestOrigin?: string | null
) {
  const configured = parseOrigin(configuredOrigin)
  if (configured) return configured

  const request = parseOrigin(requestOrigin)
  if (request) return request

  throw new Error('No existe un origen válido para autenticación.')
}

export function getSafeAuthNextPath(value: string | null, fallback: string) {
  if (value && ALLOWED_AUTH_NEXT_PATHS.has(value)) return value
  return fallback
}

function parseOrigin(value?: string | null) {
  if (!value) return null

  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.username || url.password) return null
    return url.origin
  } catch {
    return null
  }
}
