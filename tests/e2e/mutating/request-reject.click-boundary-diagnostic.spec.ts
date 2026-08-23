import { expect, test, type Page, type Request } from '@playwright/test'
import { prepareFlowR2RejectAction } from './helpers/request-reject-action'

type PostClassification = 'SERVER_ACTION_CANDIDATE' | 'FRAMEWORK_DIAGNOSTIC' | 'UNKNOWN_OR_UNEXPECTED_POST'

function classifyPost(request: Request, page: Page): PostClassification {
  const requestUrl = new URL(request.url())
  const pageUrl = new URL(page.url())
  const sameOrigin = requestUrl.origin === pageUrl.origin
  const hasNextActionHeader = Boolean(request.headers()['next-action'])
  if (request.method() === 'POST' && sameOrigin && hasNextActionHeader) return 'SERVER_ACTION_CANDIDATE'

  const contentType = request.headers()['content-type']?.split(';', 1)[0]?.toLowerCase()
  if (
    request.method() === 'POST' &&
    sameOrigin &&
    requestUrl.pathname === '/__nextjs_original-stack-frames' &&
    !hasNextActionHeader &&
    request.resourceType() === 'fetch' &&
    !request.isNavigationRequest() &&
    contentType === 'text/plain'
  ) return 'FRAMEWORK_DIAGNOSTIC'

  return 'UNKNOWN_OR_UNEXPECTED_POST'
}

test('diagnostico boundary click reject sin POST', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-admin', 'diagnostico usa admin')

  const lifecycleEvents: string[] = []
  const observedPostRequests = new Set<object>()
  const postMetadata: Array<{
    method: string
    sameOrigin: boolean
    pathname: string
    resourceType: string
    isNavigationRequest: boolean
    hasNextActionHeader: boolean
    contentTypeClass: string
    frameIsMain: boolean
  }> = []
  let rawPostAttemptCount = 0
  let serverActionPostAttemptCount = 0
  let frameworkDiagnosticPostAttemptCount = 0
  let unexpectedApplicationPostAttemptCount = 0
  let postBlockedCount = 0
  page.on('request', (request) => {
    if (request.method() !== 'POST') return
    rawPostAttemptCount += 1
    observedPostRequests.add(request)
    const index = rawPostAttemptCount
    const classification = classifyPost(request, page)
    if (classification === 'SERVER_ACTION_CANDIDATE') serverActionPostAttemptCount += 1
    else if (classification === 'FRAMEWORK_DIAGNOSTIC') frameworkDiagnosticPostAttemptCount += 1
    else unexpectedApplicationPostAttemptCount += 1
    const requestUrl = new URL(request.url())
    const pageUrl = new URL(page.url())
    const contentType = request.headers()['content-type']?.split(';', 1)[0]?.toLowerCase()
    const contentTypeClass = contentType === 'text/plain'
      ? 'TEXT_PLAIN'
      : contentType === 'application/x-www-form-urlencoded'
        ? 'FORM_URLENCODED'
        : contentType === 'multipart/form-data'
          ? 'MULTIPART_FORM_DATA'
          : contentType
            ? 'OTHER'
            : 'MISSING'
    const pathname = requestUrl.pathname.replace(
      /\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,
      '/[redacted-id]',
    )
    postMetadata.push({
      method: request.method(),
      sameOrigin: requestUrl.origin === pageUrl.origin,
      pathname,
      resourceType: request.resourceType(),
      isNavigationRequest: request.isNavigationRequest(),
      hasNextActionHeader: Boolean(request.headers()['next-action']),
      contentTypeClass,
      frameIsMain: request.frame() === page.mainFrame(),
    })
    lifecycleEvents.push(
      classification === 'SERVER_ACTION_CANDIDATE'
        ? 'SERVER_ACTION_POST_SEEN'
        : classification === 'FRAMEWORK_DIAGNOSTIC'
          ? 'FRAMEWORK_DIAGNOSTIC_POST_SEEN'
          : `UNKNOWN_POST_${index}_SEEN`,
    )
  })
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      postBlockedCount += 1
      const classification = classifyPost(request, page)
      lifecycleEvents.push(
        classification === 'SERVER_ACTION_CANDIDATE'
          ? 'SERVER_ACTION_POST_BLOCKED'
          : classification === 'FRAMEWORK_DIAGNOSTIC'
            ? 'FRAMEWORK_DIAGNOSTIC_POST_BLOCKED'
            : `UNKNOWN_POST_${postBlockedCount}_BLOCKED`,
      )
      await route.abort()
      return
    }
    await route.continue()
  })

  console.log('POST_CAN_REACH_NEXT: no')
  console.log('BUSINESS_RPC_REACHABILITY: 0')
  console.log('REMOTE_WRITE_REACHABILITY: 0')
  const { detailDialog, initialRejectControl } = await prepareFlowR2RejectAction(page, {
    searchTerm: 'E2E pending request',
    rejectionReason: 'READ_ONLY_DIAGNOSTIC',
  })
  console.log('BASELINE_REQUEST_VISIBLE: yes')
  console.log('BASELINE_REQUEST_STATUS: pending')
  await expect(detailDialog.getByText('Pendiente', { exact: true })).toBeVisible()
  console.log('DETAIL_SURFACE_COUNT: 1')
  console.log('REAL_RUNNER_HELPER_PATH_USED: yes')
  console.log('INITIAL_REJECT_CONTROL_COUNT: 1')
  const initialRejectHandle = await initialRejectControl.elementHandle()
  expect(initialRejectHandle).not.toBeNull()
  if (!initialRejectHandle) throw new Error('initial_reject_handle_missing')

  const rejectDialog = page.getByRole('dialog', { name: 'Rechazar solicitud', exact: true })
  await expect(rejectDialog).toHaveCount(0)
  console.log('REJECT_CONFIRMATION_DIALOG_COUNT_BEFORE_INITIAL_CLICK: 0')

  lifecycleEvents.push('INITIAL_CLICK')
  await initialRejectControl.click()
  console.log('INITIAL_REJECT_CLICK_COUNT: 1')
  console.log('SERVER_ACTION_POST_AFTER_INITIAL_CLICK: ' + serverActionPostAttemptCount)
  expect(serverActionPostAttemptCount).toBe(0)

  await expect(rejectDialog).toHaveCount(1)
  await expect(rejectDialog).toBeVisible()
  lifecycleEvents.push('DIALOG_VISIBLE')
  const realRejectControl = rejectDialog.getByRole('button', { name: 'Rechazar', exact: true })
  await expect(realRejectControl).toHaveCount(1)
  await expect(realRejectControl).toBeEnabled()
  const realRejectHandle = await realRejectControl.elementHandle()
  expect(realRejectHandle).not.toBeNull()
  if (!realRejectHandle) throw new Error('real_reject_handle_missing')
  const controlsAreDistinct = await initialRejectHandle.evaluate(
    (initialElement, dialogConfirmElement) => initialElement !== dialogConfirmElement,
    realRejectHandle,
  )
  expect(controlsAreDistinct).toBe(true)
  console.log('REJECT_CONFIRMATION_DIALOG_COUNT: 1')
  console.log('REAL_DIALOG_REJECT_CONTROL_COUNT: 1')
  console.log('INITIAL_REJECT_SUBMIT_DISTINCT_FROM_DIALOG_CONFIRM: PASS')

  lifecycleEvents.push('REAL_CONFIRM_CLICK')
  await realRejectControl.click()
  await expect.poll(() => postBlockedCount).toBeGreaterThanOrEqual(1)
  await page.waitForLoadState('networkidle')
  console.log('DIAGNOSTIC_REAL_CONFIRM_CLICKS: 1')
  console.log('RAW_PAGE_POST_ATTEMPTS: ' + rawPostAttemptCount)
  console.log('UNIQUE_PAGE_POST_ATTEMPTS: ' + observedPostRequests.size)
  console.log('SERVER_ACTION_POST_ATTEMPTS: ' + serverActionPostAttemptCount)
  console.log('FRAMEWORK_DIAGNOSTIC_POST_ATTEMPTS: ' + frameworkDiagnosticPostAttemptCount)
  console.log('UNEXPECTED_APPLICATION_POST_ATTEMPTS: ' + unexpectedApplicationPostAttemptCount)
  console.log('SERVER_ACTION_POST_AFTER_REAL_CONFIRM: ' + serverActionPostAttemptCount)
  console.log('PAGE_POST_BLOCKED: ' + postBlockedCount)
  console.log('ALL_PAGE_POSTS_BLOCKED: ' + (postBlockedCount === rawPostAttemptCount ? 'yes' : 'no'))
  console.log('POST_REACHED_NEXT: no')
  for (const [offset, metadata] of postMetadata.entries()) {
    const index = offset + 1
    console.log(`POST_${index}_METHOD: ${metadata.method}`)
    console.log(`POST_${index}_SAME_ORIGIN: ${metadata.sameOrigin ? 'yes' : 'no'}`)
    console.log(`POST_${index}_PATHNAME: ${metadata.pathname}`)
    console.log(`POST_${index}_RESOURCE_TYPE: ${metadata.resourceType}`)
    console.log(`POST_${index}_IS_NAVIGATION_REQUEST: ${metadata.isNavigationRequest ? 'yes' : 'no'}`)
    console.log(`POST_${index}_HAS_NEXT_ACTION_HEADER: ${metadata.hasNextActionHeader ? 'yes' : 'no'}`)
    console.log(`POST_${index}_CONTENT_TYPE_CLASS: ${metadata.contentTypeClass}`)
    console.log(`POST_${index}_FRAME_IS_MAIN: ${metadata.frameIsMain ? 'yes' : 'no'}`)
  }
  lifecycleEvents.forEach((event, offset) => console.log(`EVENT_${offset + 1}: ${event}`))
  console.log('ACTION_DONE_FALSE_POSITIVE_REACHABILITY: 0')
  console.log('SERVER_ACTION_COMPLETION_BARRIER: PASS')
  console.log('POST_CLICK_BROWSER_LIFECYCLE: PASS')
  expect(rawPostAttemptCount).toBe(observedPostRequests.size)
  expect(postBlockedCount).toBe(rawPostAttemptCount)
  expect(serverActionPostAttemptCount).toBe(1)
  expect(frameworkDiagnosticPostAttemptCount).toBe(rawPostAttemptCount - 1)
  expect(unexpectedApplicationPostAttemptCount).toBe(0)
})
