export function classifyPagePost({
  method,
  sameOrigin,
  pathname,
  hasNextActionHeader,
  resourceType,
  isNavigationRequest,
  contentType,
}) {
  if (method !== 'POST') return 'NOT_POST'
  if (sameOrigin && hasNextActionHeader) return 'SERVER_ACTION'
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase()
  if (
    sameOrigin &&
    pathname === '/__nextjs_original-stack-frames' &&
    !hasNextActionHeader &&
    resourceType === 'fetch' &&
    !isNavigationRequest &&
    mediaType === 'text/plain'
  ) return 'FRAMEWORK_DIAGNOSTIC'
  return 'UNKNOWN_OR_UNEXPECTED_POST'
}
