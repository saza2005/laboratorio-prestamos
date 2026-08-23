import fs from 'node:fs'
import path from 'node:path'

const UUID_SEGMENT = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi

export function sanitizePath(urlOrPath) {
  const parsed = new URL(urlOrPath, 'http://local.invalid')
  const pathname = decodeURIComponent(parsed.pathname)
  return pathname.replace(UUID_SEGMENT, '<id>')
}

export function contentTypeClass(value) {
  if (!value) return 'absent'
  const type = value.split(';', 1)[0].trim().toLowerCase()
  if (type === 'application/json') return 'application/json'
  if (type === 'text/plain') return 'text/plain'
  return 'other'
}

export function makeSanitizedPostRecord({ ordinal, elapsedMs, phase, request, pageOrigin, classifierResult = 'PENDING' }) {
  const requestUrl = new URL(request.url())
  const headers = request.headers()
  const hasNextActionHeader = Boolean(headers['next-action'])
  const contentType = headers['content-type'] ?? ''
  const sameOrigin = requestUrl.origin === pageOrigin
  const pathClass = sanitizePath(request.url())
  const isFrameworkDiagnosticCandidate = sameOrigin &&
    pathClass === '/__nextjs_original-stack-frames' &&
    !hasNextActionHeader &&
    request.resourceType() === 'fetch' &&
    !request.isNavigationRequest()
  return {
    ordinal,
    elapsed_ms: elapsedMs,
    phase,
    method: request.method(),
    same_origin: sameOrigin,
    path_class: pathClass,
    resource_type: request.resourceType(),
    has_next_action_header: hasNextActionHeader,
    has_content_type: Boolean(contentType),
    content_type_class: contentTypeClass(contentType),
    is_framework_diagnostic_candidate: isFrameworkDiagnosticCandidate,
    blocked_by_kill_switch: false,
    reached_next: false,
    runtime_classifier_result: classifierResult,
  }
}

export function writeSanitizedCapture(filePath, records) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 })
  const temp = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(temp, JSON.stringify(records, null, 2) + '\n', { mode: 0o600 })
  fs.renameSync(temp, filePath)
}
