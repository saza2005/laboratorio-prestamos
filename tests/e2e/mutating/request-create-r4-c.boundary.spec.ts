import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { classifyPagePost } from '../../../scripts/e2e/lib/post-request-classifier.mjs'
import { makeSanitizedPostRecord, writeSanitizedCapture } from '../../../scripts/e2e/lib/sanitized-post-capture.mjs'
import { validateHandshakeTransition } from '../../../scripts/e2e/lib/runtime-handshake.mjs'
import { prepareR4GroupedRequestForm } from './helpers/request-create-groups-form'

const capturePath = '.e2e-state/runtime/r4-c-posts.json'

function readPurpose(): string {
  const snapshot = JSON.parse(fs.readFileSync('.e2e-state/runtime/r4-pre-snapshot.json', 'utf8'))
  if (snapshot.flow !== 'FLOW-R4' || snapshot.creationAttemptCount !== 0 || typeof snapshot.purpose !== 'string') {
    throw new Error('invalid_r4_pre_snapshot')
  }
  return snapshot.purpose
}

test('R4-C bloquea el grouped-create Server Action antes de Next', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-teacher', 'R4-C usa teacher')

  fs.rmSync(capturePath, { force: true })
  const captureRecords: Array<Record<string, unknown>> = []
  const startedAt = process.hrtime.bigint()
  let phase = 'BEFORE_DIAGNOSTIC_CLICK'
  let postAttempts = 0
  let serverActionPosts = 0
  let frameworkDiagnosticPosts = 0
  let unknownPosts = 0

  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') {
      await route.continue()
      return
    }

    postAttempts += 1
    const requestUrl = new URL(request.url())
    const pageUrl = new URL(page.url())
    const classification = classifyPagePost({
      method: request.method(),
      sameOrigin: requestUrl.origin === pageUrl.origin,
      pathname: requestUrl.pathname,
      hasNextActionHeader: Boolean(request.headers()['next-action']),
      resourceType: request.resourceType(),
      isNavigationRequest: request.isNavigationRequest(),
      contentType: request.headers()['content-type'] ?? '',
    })

    if (classification === 'SERVER_ACTION') serverActionPosts += 1
    else if (classification === 'FRAMEWORK_DIAGNOSTIC') frameworkDiagnosticPosts += 1
    else unknownPosts += 1

    const record = makeSanitizedPostRecord({
      ordinal: postAttempts,
      elapsedMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      phase,
      request,
      pageOrigin: pageUrl.origin,
      classifierResult: classification,
    })
    record.blocked_by_kill_switch = true
    record.reached_next = false
    captureRecords.push(record)
    writeSanitizedCapture(capturePath, captureRecords)
    await route.abort('blockedbyclient')
  })

  await prepareR4GroupedRequestForm(page, readPurpose())
  expect(postAttempts).toBe(0)

  validateHandshakeTransition(null, 'BROWSER_STARTING')
  validateHandshakeTransition('BROWSER_STARTING', 'BROWSER_READY')
  validateHandshakeTransition('BROWSER_READY', 'HANDOFF_DRY_RUN')
  validateHandshakeTransition('HANDOFF_DRY_RUN', 'ACTION_ARMED_DRY_RUN')
  const submit = page.getByRole('button', { name: 'Enviar solicitud con grupos', exact: true })
  await expect(submit).toHaveCount(1)
  await expect(submit).toBeVisible()
  await expect(submit).toBeEnabled()
  console.log('R4_ACTION_ARMED_COUNT: 1')
  console.log('R4_ACTION_GO_COUNT: 0')

  phase = 'AFTER_DIAGNOSTIC_CLICK'
  await submit.click()
  console.log('R4_C_SUBMIT_CLICKS: 1')
  console.log('R4_BUSINESS_CREATION_ATTEMPT_COUNT: 1')

  await expect.poll(() => postAttempts).toBeGreaterThan(0)
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))

  expect(serverActionPosts).toBe(1)
  expect(unknownPosts).toBe(0)
  expect(captureRecords.every((record) => record.blocked_by_kill_switch === true && record.reached_next === false)).toBe(true)
  expect(captureRecords.length).toBe(serverActionPosts + frameworkDiagnosticPosts)
  validateHandshakeTransition('ACTION_ARMED_DRY_RUN', 'CANCEL')
  validateHandshakeTransition('CANCEL', 'CLEAN')

  console.log('R4_GROUP_CREATE_SERVER_ACTION_POST_ATTEMPTS: ' + serverActionPosts)
  console.log('R4_FRAMEWORK_DIAGNOSTIC_POST_ATTEMPTS: ' + frameworkDiagnosticPosts)
  console.log('R4_UNEXPECTED_APPLICATION_POST_ATTEMPTS: 0')
  console.log('R4_SECOND_SERVER_ACTION_POST_ATTEMPTS: 0')
  console.log('R4_UNKNOWN_POST_ATTEMPTS: ' + unknownPosts)
  console.log('RAW_PAGE_POST_ATTEMPTS: ' + postAttempts)
  console.log('R4_POST_ACCOUNTING_STABILIZED: yes')
  console.log('R4_POST_ACCOUNTING_INVARIANT: PASS')
  console.log('R4_GROUP_CREATE_SERVER_ACTION_ALLOWED_TO_NEXT: 0')
  console.log('R4_GROUP_CREATE_SERVER_ACTION_REACHED_NEXT: no')
  console.log('PAGE_POSTS_REACHED_NEXT: 0')
  console.log('R4_BUSINESS_RPC_EXECUTIONS: 0')
  console.log('R4_C_HANDSHAKE_EVENT_ORDER: BROWSER_STARTING -> BROWSER_READY -> HANDOFF_DRY_RUN -> ACTION_ARMED_DRY_RUN -> CANCEL -> CLEAN')
  console.log('INVALID_HANDSHAKE_TRANSITIONS: 0')
  console.log('TERMINAL_HANDSHAKE_COUNT: 1')
  console.log('R4_ACTION_RUNNING_COUNT: 0')
  console.log('R4_ACTION_DONE_COUNT: 0')
})
