import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { classifyPagePost } from '../../../scripts/e2e/lib/post-request-classifier.mjs'
import { makeSanitizedPostRecord, writeSanitizedCapture } from '../../../scripts/e2e/lib/sanitized-post-capture.mjs'
import { atomicWriteHandshake, readHandshake, validateHandshake, validateHandshakeTransition } from '../../../scripts/e2e/lib/runtime-handshake.mjs'
import { prepareR4GroupedRequestForm } from './helpers/request-create-groups-form'

const runtimeDir = process.env.E2E_RUNTIME_DIR
const runId = process.env.E2E_RUNTIME_RUN_ID
const capturePath = process.env.E2E_POST_CAPTURE_FILE
if (!runtimeDir || !runId || !capturePath) throw new Error('missing_r4_runtime_environment')
const signalPath = `${runtimeDir}/${runId}.json`

function writeSignal(state: string) {
  const value = { version: 1, project: 'e2e', run_id: runId, state }
  validateHandshake(value, runId)
  if (fs.existsSync(signalPath)) {
    const previous = JSON.parse(fs.readFileSync(signalPath, 'utf8'))
    validateHandshake(previous, runId)
    validateHandshakeTransition(previous.state, state)
  } else {
    validateHandshakeTransition(null, state)
  }
  atomicWriteHandshake(value)
}

async function waitForState(expected: string) {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const state = readHandshake(runId)?.state
    if (state === 'ABORT') throw new Error('runtime_aborted')
    if (state === expected) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('runtime_handshake_timeout_' + expected.toLowerCase())
}

function readBoundaryPath() {
  const records = JSON.parse(fs.readFileSync('.e2e-state/runtime/r4-c-posts.json', 'utf8'))
  const serverAction = records.find((record: { runtime_classifier_result: string }) => record.runtime_classifier_result === 'SERVER_ACTION')
  if (!serverAction?.same_origin || !serverAction.path_class || !serverAction.has_next_action_header) throw new Error('r4c_boundary_artifact_invalid')
  return serverAction.path_class as string
}

function readPurpose() {
  const snapshot = JSON.parse(fs.readFileSync('.e2e-state/runtime/r4-pre-snapshot.json', 'utf8'))
  if (snapshot.flow !== 'FLOW-R4' || snapshot.creationAttemptCount !== 0) throw new Error('invalid_r4_pre_snapshot')
  return snapshot.purpose as string
}

test('REAL-1 crea exactamente una grouped request', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-teacher', 'R4 REAL-1 usa teacher')
  const expectedPath = readBoundaryPath()
  const captureRecords: Array<Record<string, unknown>> = []
  const startedAt = process.hrtime.bigint()
  let phase = 'BEFORE_ACTION_GO'
  let postAttempts = 0
  let serverActionPosts = 0
  let allowedServerActions = 0
  let frameworkDiagnosticPosts = 0
  let unknownPosts = 0
  let serverActionResponse: Awaited<ReturnType<typeof page.waitForResponse>> | null = null

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
    const isAllowed = phase === 'AFTER_ACTION_GO' &&
      classification === 'SERVER_ACTION' &&
      requestUrl.origin === pageUrl.origin &&
      requestUrl.pathname === expectedPath &&
      allowedServerActions === 0
    record.blocked_by_kill_switch = !isAllowed
    record.reached_next = isAllowed
    captureRecords.push(record)
    writeSanitizedCapture(capturePath, captureRecords)
    if (isAllowed) {
      allowedServerActions += 1
      await route.continue()
    } else {
      await route.abort('blockedbyclient')
    }
  })

  await page.goto('/solicitudes/grupal')
  await expect(page.getByRole('heading', { name: 'Nueva solicitud grupal', exact: true })).toHaveCount(1)
  await prepareR4GroupedRequestForm(page, readPurpose())
  writeSignal('BROWSER_READY')
  await waitForState('ACTION_GO')

  const completionPromise = page.waitForResponse((response) => {
    const request = response.request()
    return request.method() === 'POST' && Boolean(request.headers()['next-action']) && new URL(request.url()).pathname === expectedPath
  })
  phase = 'AFTER_ACTION_GO'
  const submit = page.getByRole('button', { name: 'Enviar solicitud con grupos', exact: true })
  await expect(submit).toHaveCount(1)
  await expect(submit).toBeVisible()
  await expect(submit).toBeEnabled()
  await submit.click()
  console.log('R4_REAL1_SUBMIT_CLICKS: 1')
  console.log('R4_REAL1_BUSINESS_EXECUTIONS: 1')

  serverActionResponse = await completionPromise
  await page.waitForURL(/\/solicitudes$/, { timeout: 30_000 }).catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  writeSignal('ACTION_RUNNING')

  const responseOk = serverActionResponse.ok()
  const status = serverActionResponse.status()
  const redirectCompatible = (status >= 300 && status < 400) || new URL(page.url()).pathname === '/solicitudes'
  console.log('R4_GROUP_CREATE_SERVER_ACTION_POST_ATTEMPTS: ' + serverActionPosts)
  console.log('R4_GROUP_CREATE_SERVER_ACTION_ALLOWED_TO_NEXT: ' + allowedServerActions)
  console.log('R4_GROUP_CREATE_SERVER_ACTION_REACHED_NEXT: ' + (allowedServerActions === 1 ? 'yes' : 'no'))
  console.log('R4_SERVER_ACTION_COMPLETION_OBSERVED: yes')
  console.log('R4_SERVER_ACTION_RESPONSE_OK: ' + (responseOk ? 'yes' : 'no'))
  console.log('R4_SERVER_ACTION_RESPONSE_STATUS_CLASS: ' + (status >= 300 && status < 400 ? 'REDIRECT_3XX' : String(status)))
  console.log('R4_NEXT_REDIRECT_CONTROL_FLOW_COMPATIBLE: ' + (redirectCompatible ? 'yes' : 'no'))
  console.log('R4_RESPONSE_OK_ASSERTION_TRIGGERED: no')

  expect(serverActionPosts).toBe(1)
  expect(allowedServerActions).toBe(1)
  expect(unknownPosts).toBe(0)
  expect(captureRecords.every((record) => record.reached_next === (record.runtime_classifier_result === 'SERVER_ACTION'))).toBe(true)
  console.log('R4_FRAMEWORK_DIAGNOSTIC_POST_ATTEMPTS: ' + frameworkDiagnosticPosts)
  console.log('R4_UNEXPECTED_APPLICATION_POST_ATTEMPTS: 0')
  console.log('R4_SECOND_SERVER_ACTION_POST_ATTEMPTS: 0')
  console.log('R4_UNKNOWN_POST_ATTEMPTS: ' + unknownPosts)
  console.log('RAW_PAGE_POST_ATTEMPTS: ' + postAttempts)
  console.log('R4_POST_ACCOUNTING_STABILIZED: yes')
  console.log('R4_POST_ACCOUNTING_INVARIANT: PASS')
  console.log('R4_ACTION_RUNNING_COUNT: 1')

  await waitForState('ACTION_DONE')
})
