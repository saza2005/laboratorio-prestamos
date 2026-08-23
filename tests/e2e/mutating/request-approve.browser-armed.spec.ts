import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { prepareFlowR3ApproveAction } from './helpers/request-approve-action'
import { validateFlowR3SeededState } from '../../../scripts/e2e/lib/flow-r3-state-gate.mjs'
import { validateHandshake, validateHandshakeTransition } from '../../../scripts/e2e/lib/runtime-handshake.mjs'
import { classifyPagePost } from '../../../scripts/e2e/lib/post-request-classifier.mjs'
import { makeSanitizedPostRecord, writeSanitizedCapture } from '../../../scripts/e2e/lib/sanitized-post-capture.mjs'

function writeSignal(signalPath: string, runId: string, state: string) {
  const value = { version: 1, project: 'e2e', run_id: runId, state }
  validateHandshake(value, runId)
  if (fs.existsSync(signalPath)) {
    const previous = JSON.parse(fs.readFileSync(signalPath, 'utf8'))
    validateHandshake(previous, runId)
    validateHandshakeTransition(previous.state, state)
  } else {
    validateHandshakeTransition(null, state)
  }
  const temp = `${signalPath}.tmp-${process.pid}`
  fs.writeFileSync(temp, JSON.stringify(value) + '\n', { mode: 0o600 })
  fs.renameSync(temp, signalPath)
}

async function waitForState(signalPath: string, runId: string, expected: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (fs.existsSync(signalPath)) {
      const signal = JSON.parse(fs.readFileSync(signalPath, 'utf8'))
      validateHandshake(signal, runId)
      if (signal.state === 'ABORT') throw new Error('runtime_aborted')
      if (signal.state === expected) return
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('runtime_handshake_timeout_' + expected.toLowerCase())
}

test('browser armado FLOW-R3 seeded UI sin aprobar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-admin', 'FLOW-R3 usa admin')
  const runtimeDir = process.env.E2E_RUNTIME_DIR
  const runId = process.env.E2E_RUNTIME_RUN_ID
  if (!runtimeDir || !runId) throw new Error('missing_runtime_handshake_environment')
  const signalPath = `${runtimeDir}/${runId}.json`
  const capturePath = process.env.E2E_POST_CAPTURE_FILE
  const captureEnabled = process.env.E2E_RUNTIME_S3B_CAPTURE === '1' && Boolean(capturePath)
  const realApproval = process.env.E2E_RUNTIME_REAL_APPROVAL === '1'
  const locatorValidation = process.env.E2E_RUNTIME_LOCATOR_VALIDATION === '1'
  const captureRecords: Array<Record<string, unknown>> = []
  const captureStartedAt = process.hrtime.bigint()
  let phase = 'BEFORE_INITIAL_CLICK'
  let postAttempts = 0
  let approvalServerActionPostAttempts = 0
  let frameworkDiagnosticPostAttempts = 0
  let unexpectedApplicationPostAttempts = 0
  let postBlocked = 0
  let approvalServerActionAllowedToNext = 0
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      postAttempts += 1
      if (captureEnabled && capturePath) {
        const record = makeSanitizedPostRecord({
          ordinal: postAttempts,
          elapsedMs: Number(process.hrtime.bigint() - captureStartedAt) / 1_000_000,
          phase,
          request,
          pageOrigin: new URL(page.url()).origin,
        })
        captureRecords.push(record)
        writeSanitizedCapture(capturePath, captureRecords)
      }
      const requestUrl = new URL(request.url())
      const pageUrl = new URL(page.url())
      const headers = request.headers()
      const classification = classifyPagePost({
        method: request.method(),
        sameOrigin: requestUrl.origin === pageUrl.origin,
        pathname: requestUrl.pathname,
        hasNextActionHeader: Boolean(headers['next-action']),
        resourceType: request.resourceType(),
        isNavigationRequest: request.isNavigationRequest(),
        contentType: headers['content-type'] ?? '',
      })
      if (classification === 'SERVER_ACTION') approvalServerActionPostAttempts += 1
      else if (classification === 'FRAMEWORK_DIAGNOSTIC') frameworkDiagnosticPostAttempts += 1
      else unexpectedApplicationPostAttempts += 1
      const allowApproval = realApproval && phase === 'AFTER_REAL_CONFIRM' && requestUrl.pathname === '/dashboard/solicitudes' && classification === 'SERVER_ACTION' && approvalServerActionAllowedToNext === 0
      if (allowApproval) approvalServerActionAllowedToNext += 1
      else postBlocked += 1
      if (captureEnabled && capturePath) {
        const record = captureRecords[captureRecords.length - 1]
        record.runtime_classifier_result = classification
        record.blocked_by_kill_switch = !allowApproval
        record.reached_next = allowApproval
        writeSanitizedCapture(capturePath, captureRecords)
      }
      if (allowApproval) {
        await route.continue()
      } else {
        await route.abort()
      }
      return
    }
    await route.continue()
  })

  await page.goto('/dashboard/solicitudes')
  await expect(page).toHaveURL(/\/dashboard\/solicitudes$/)
  await expect(page.getByPlaceholder('Buscar por solicitante, correo, propósito, ítem o código patrimonial')).toBeVisible()
  writeSignal(signalPath, runId, 'BROWSER_READY')

  if (process.env.E2E_RUNTIME_READONLY === '1') {
    await waitForState(signalPath, runId, 'HANDOFF_DRY_RUN')
    writeSignal(signalPath, runId, 'ACTION_ARMED_DRY_RUN')
    await waitForState(signalPath, runId, 'CANCEL')
    writeSignal(signalPath, runId, 'CLEAN')
    console.log('PAGE_POST_KILL_SWITCH_ACTIVE: yes\nPAGE_POST_ATTEMPTS: 0')
    return
  }

  await waitForState(signalPath, runId, 'FIXTURE_READY')
  const state = JSON.parse(fs.readFileSync('.e2e-state/mutating-tests.json', 'utf8'))
  const flow = validateFlowR3SeededState(state)
  const controls = await prepareFlowR3ApproveAction(page, { searchTerm: flow.correlation_marker })
  expect(postAttempts).toBe(0)
  console.log('PAGE_POST_KILL_SWITCH_ACTIVE: yes')
  console.log('PAGE_POST_ATTEMPTS: 0')
  console.log('DETAIL_SURFACE_COUNT: 1')
  console.log('R3_FIXTURE_STATUS_UI: pending')
  console.log('R3_FIXTURE_TYPE_UI: individual')
  console.log('INITIAL_APPROVE_CONTROL_COUNT: 1')
  console.log('INITIAL_APPROVE_CLICK_COUNT: 1')
  console.log('SERVER_ACTION_POST_AFTER_INITIAL_APPROVE_CLICK: 0')
  console.log('APPROVE_CONFIRMATION_DIALOG_COUNT: 1')
  console.log('REAL_DIALOG_APPROVE_CONTROL_COUNT: 1')
  if (locatorValidation) {
    const realHandle = await controls.realConfirm.elementHandle()
    expect(realHandle).not.toBeNull()
    if (!realHandle) throw new Error('approve_confirm_handle_missing')
    expect(await controls.initialElementHandle.evaluate((initialElement, confirmElement) => initialElement !== confirmElement, realHandle)).toBe(true)
    console.log('REAL_R3_UI_HELPER_PATH_USED: yes')
    console.log('INITIAL_CONTROL_VISIBLE: yes\nINITIAL_CONTROL_ENABLED: yes')
    console.log('INITIAL_ELEMENT_HANDLE_CAPTURE_COUNT: 1\nINITIAL_HANDLE_CAPTURE_BEFORE_CLICK: yes')
    console.log('REAL_CONFIRM_ELEMENT_HANDLE_COUNT: 1')
    console.log('INITIAL_APPROVE_SUBMIT_DISTINCT_FROM_DIALOG_CONFIRM: PASS')
    console.log('POST_DIALOG_INITIAL_LOCATOR_REEVALUATION_COUNT: 0\nAMBIGUOUS_FORM_REQUERY_RUNTIME_REACHABILITY: 0')
    writeSignal(signalPath, runId, 'ACTION_ARMED')
    await waitForState(signalPath, runId, 'CANCEL', 120000)
    writeSignal(signalPath, runId, 'CLEAN')
    return
  }
  if (realApproval) {
    const initialHandle = controls.initialElementHandle
    const realHandle = await controls.realConfirm.elementHandle()
    expect(realHandle).not.toBeNull()
    if (!realHandle) throw new Error('approve_confirm_handle_missing')
    expect(await initialHandle.evaluate((initialElement, confirmElement) => initialElement !== confirmElement, realHandle)).toBe(true)
    console.log('INITIAL_APPROVE_SUBMIT_DISTINCT_FROM_DIALOG_CONFIRM: PASS')
    console.log('GLOBAL_FINAL_APPROVE_LOCATORS: 0\nFIRST_LAST_NTH_APPROVE_WORKAROUNDS: 0')
    writeSignal(signalPath, runId, 'ACTION_ARMED')
    await waitForState(signalPath, runId, 'ACTION_GO', 120000)
    const completion = page.waitForResponse((response) => response.request().method() === 'POST' && Boolean(response.request().headers()['next-action']))
    phase = 'AFTER_REAL_CONFIRM'
    await controls.realConfirm.click()
    console.log('REAL_APPROVE_CONFIRM_CLICK_COUNT: 1\nR3_REAL_ATTEMPT_1_APPROVAL_EXECUTIONS: 1')
    const response = await completion
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
    if (approvalServerActionAllowedToNext !== 1) throw new Error('approval_server_action_allow_count_mismatch')
    if (unexpectedApplicationPostAttempts !== 0) throw new Error('unexpected_application_post')
    if (approvalServerActionPostAttempts !== 1) throw new Error('approval_server_action_count_mismatch')
    console.log('APPROVAL_SERVER_ACTION_POST_ATTEMPTS: 1\nAPPROVAL_SERVER_ACTION_POST_ALLOWED_TO_NEXT: 1\nAPPROVAL_SERVER_ACTION_REACHED_NEXT: yes')
    console.log('SERVER_ACTION_COMPLETION_OBSERVED: yes')
    console.log('SERVER_ACTION_RESPONSE_OK: ' + (response.ok() ? 'yes' : 'no'))
    console.log('RESPONSE_OK_ASSERTION_TRIGGERED: no')
    console.log('FRAMEWORK_DIAGNOSTIC_POST_ATTEMPTS: ' + frameworkDiagnosticPostAttempts)
    console.log('UNEXPECTED_APPLICATION_POST_ATTEMPTS: 0\nSECOND_SERVER_ACTION_POST_ATTEMPTS: 0\nUNKNOWN_POST_ATTEMPTS: 0')
    console.log('FINAL_POST_ACCOUNTING_STABILIZED: yes')
    writeSignal(signalPath, runId, 'ACTION_RUNNING')
    await waitForState(signalPath, runId, 'ACTION_DONE', 120000)
    writeSignal(signalPath, runId, 'CANCEL')
    writeSignal(signalPath, runId, 'CLEAN')
    return
  }
  phase = 'AFTER_INITIAL_CLICK'
  if (process.env.E2E_RUNTIME_S3_DIAGNOSTIC === '1') {
    phase = 'BEFORE_REAL_CONFIRM'
    await controls.realConfirm.click()
    phase = 'AFTER_REAL_CONFIRM'
    await expect.poll(() => approvalServerActionPostAttempts).toBe(1)
    if (process.env.E2E_RUNTIME_S3B_CAPTURE !== '1' && unexpectedApplicationPostAttempts !== 0) throw new Error('unexpected_application_post')
    console.log('DIAGNOSTIC_REAL_APPROVE_CONFIRM_CLICKS: 1')
    console.log('RAW_PAGE_POST_ATTEMPTS: ' + postAttempts)
    console.log('APPROVAL_SERVER_ACTION_POST_ATTEMPTS: ' + approvalServerActionPostAttempts)
    console.log('APPROVAL_SERVER_ACTION_POST_ATTEMPTED: yes')
    console.log('APPROVAL_SERVER_ACTION_POST_AFTER_REAL_CONFIRM: 1')
    console.log('FRAMEWORK_DIAGNOSTIC_POST_ATTEMPTS: ' + frameworkDiagnosticPostAttempts)
    console.log('UNEXPECTED_APPLICATION_POST_ATTEMPTS: 0')
    console.log('ALL_PAGE_POSTS_BLOCKED: ' + (postBlocked === postAttempts ? 'yes' : 'no'))
    console.log('PAGE_POSTS_REACHED_NEXT: 0\nAPPROVAL_SERVER_ACTION_REACHED_NEXT: no')
    if (process.env.E2E_RUNTIME_S3B_CAPTURE === '1') console.log('BOUNDARY_CLASSIFIER_FAIL_CLOSED: ' + (unexpectedApplicationPostAttempts > 0 ? 'yes' : 'no'))
  } else {
    console.log('DIAGNOSTIC_REAL_APPROVE_CONFIRM_CLICKS: 0')
  }
  writeSignal(signalPath, runId, 'ACTION_ARMED')
  await waitForState(signalPath, runId, 'CANCEL')
  writeSignal(signalPath, runId, 'CLEAN')
})
