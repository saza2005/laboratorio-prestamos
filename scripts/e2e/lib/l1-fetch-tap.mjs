import { safeErrorFingerprint } from './clean-state-diagnostics.mjs'

export function createDiagnosticFetchTap(originalFetch, onEvent = () => {}) {
  return async (input, init) => {
    try {
      const response = await originalFetch(input, init)
      onEvent({ result: 'FETCH_RESOLUTION', resolution: 'RESOLVED', status: response.status, statusClass: statusClass(response.status), contentTypeClass: contentTypeClass(response.headers.get('content-type')) })
      return response
    } catch (error) {
      onEvent({ result: 'FETCH_RESOLUTION', resolution: 'REJECTED', fingerprint: safeErrorFingerprint(error) })
      throw error
    }
  }
}

function statusClass(status) {
  if (status >= 500) return 'HTTP_5XX'
  if (status >= 400) return 'HTTP_4XX'
  if (status >= 200) return 'HTTP_2XX'
  return 'ZERO_OR_OTHER'
}

function contentTypeClass(value) {
  if (!value) return 'ABSENT'
  if (value.includes('json')) return 'JSON'
  if (value.includes('text')) return 'TEXT'
  return 'OTHER'
}
