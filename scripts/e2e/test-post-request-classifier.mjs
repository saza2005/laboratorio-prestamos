import { classifyPagePost } from './lib/post-request-classifier.mjs'

function expectClassification(input, expected, label) {
  const actual = classifyPagePost(input)
  if (actual !== expected) throw new Error(`post_classifier_failed:${label}`)
}

const base = {
  method: 'POST',
  sameOrigin: true,
  pathname: '/dashboard/solicitudes',
  hasNextActionHeader: true,
  resourceType: 'fetch',
  isNavigationRequest: false,
  contentType: 'multipart/form-data',
}

expectClassification(base, 'SERVER_ACTION', 'server_action_positive_protocol_evidence')
expectClassification({ ...base, pathname: '/__nextjs_original-stack-frames', hasNextActionHeader: false, contentType: 'text/plain' }, 'FRAMEWORK_DIAGNOSTIC', 'exact_framework_diagnostic')
expectClassification({ ...base, pathname: '/__nextjs_original-stack-frames', hasNextActionHeader: false, contentType: 'text/plain; charset=utf-8' }, 'FRAMEWORK_DIAGNOSTIC', 'framework_diagnostic_charset')
expectClassification({ ...base, pathname: '/__nextjs_other', hasNextActionHeader: false, contentType: 'text/plain' }, 'UNKNOWN_OR_UNEXPECTED_POST', 'no_generic_nextjs_exemption')
expectClassification({ ...base, pathname: '/api/unknown', hasNextActionHeader: false, contentType: 'application/json' }, 'UNKNOWN_OR_UNEXPECTED_POST', 'unknown_application_post')
expectClassification({ ...base, method: 'GET', hasNextActionHeader: false }, 'NOT_POST', 'non_post')

console.log('REQUEST_CLASSIFIER_LOCAL_TESTS: PASS')
console.log('UNKNOWN_POST_FAIL_CLOSED_TEST: PASS')
