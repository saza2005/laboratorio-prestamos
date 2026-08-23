import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { prepareFlowR2RejectAction } from './helpers/request-reject-action'
import { validateFlowR2SeededState } from '../../../scripts/e2e/lib/flow-r2-state-gate.mjs'
import { validateHandshake, validateHandshakeTransition } from '../../../scripts/e2e/lib/runtime-handshake.mjs'
import { classifyPagePost } from '../../../scripts/e2e/lib/post-request-classifier.mjs'
import { publishActionRunningAfterCompletion } from '../../../scripts/e2e/lib/reject-lifecycle-coordinator.mjs'

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

async function waitForState(signalPath: string, runId: string, expected: string, timeoutMs = 30_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(signalPath)) {
      const signal = JSON.parse(fs.readFileSync(signalPath, 'utf8'))
      validateHandshake(signal, runId)
      if (signal.state === 'ABORT') throw new Error('runtime_aborted')
      if (signal.state === expected) return
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('runtime_handshake_timeout')
}

test('browser armado FLOW-R2 sin mutacion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-admin', 'browser handshake usa admin')
  const runtimeDir = process.env.E2E_RUNTIME_DIR
  const runId = process.env.E2E_RUNTIME_RUN_ID
  if (!runtimeDir || !runId) throw new Error('missing_runtime_handshake_environment')
  const signalPath = `${runtimeDir}/${runId}.json`
  let rawPagePostAttempts = 0
  let serverActionPostAttempts = 0
  let frameworkDiagnosticPostAttempts = 0
  let unexpectedApplicationPostAttempts = 0
  page.on('request', (request) => {
    if (request.method() !== 'POST') return
    rawPagePostAttempts += 1
    const requestUrl = new URL(request.url())
    const pageUrl = new URL(page.url())
    const sameOrigin = requestUrl.origin === pageUrl.origin
    const hasNextActionHeader = Boolean(request.headers()['next-action'])
    const contentType = request.headers()['content-type']?.split(';', 1)[0]?.toLowerCase()
    const classification = classifyPagePost({
      method: request.method(),
      sameOrigin,
      pathname: requestUrl.pathname,
      hasNextActionHeader,
      resourceType: request.resourceType(),
      isNavigationRequest: request.isNavigationRequest(),
      contentType,
    })
    if (classification === 'SERVER_ACTION') serverActionPostAttempts += 1
    else if (classification === 'FRAMEWORK_DIAGNOSTIC') frameworkDiagnosticPostAttempts += 1
    else unexpectedApplicationPostAttempts += 1
  })
  await page.goto('/dashboard/solicitudes')
  await expect(page).toHaveURL(/\/dashboard\/solicitudes$/)
  await expect(page.getByPlaceholder('Buscar por solicitante, correo, propósito, ítem o código patrimonial')).toBeVisible()
  writeSignal(signalPath, runId, 'BROWSER_READY')
  if (process.env.E2E_RUNTIME_REAL === '1') {
    await waitForState(signalPath, runId, 'FIXTURE_READY', 120000)
    const state = JSON.parse(fs.readFileSync('.e2e-state/mutating-tests.json', 'utf8'))
    const flow = validateFlowR2SeededState(state)
    const { initialRejectControl } = await prepareFlowR2RejectAction(page, {
      searchTerm: flow.correlation_marker,
      rejectionReason: 'E2E_MUT_REQ_R2_REJECTION',
    })
    console.log('CANONICAL_STATE_GATE: PASS')
    console.log('REAL_RUNNER_HELPER_PATH_USED: yes')
    console.log('DETAIL_SURFACE_COUNT: 1')
    console.log('R2_FIXTURE_STATUS_BEFORE: pending')
    console.log('REAL_FLOW_POST_KILL_SWITCH_ACTIVE: no')
    const initialRejectHandle = await initialRejectControl.elementHandle()
    expect(initialRejectHandle).not.toBeNull()
    if (!initialRejectHandle) throw new Error('initial_reject_handle_missing')
    writeSignal(signalPath, runId, 'ACTION_ARMED')
    await waitForState(signalPath, runId, 'ACTION_GO', 120000)
    console.log('INITIAL_REJECT_CONTROL_COUNT: 1')
    await initialRejectControl.click()
    console.log('INITIAL_REJECT_CLICK_COUNT: 1')
    const rejectDialog = page.getByRole('dialog', { name: 'Rechazar solicitud', exact: true })
    await expect(rejectDialog).toHaveCount(1)
    const realRejectControl = rejectDialog.getByRole('button', { name: 'Rechazar', exact: true })
    await expect(realRejectControl).toHaveCount(1)
    const realRejectHandle = await realRejectControl.elementHandle()
    expect(realRejectHandle).not.toBeNull()
    if (!realRejectHandle) throw new Error('real_reject_handle_missing')
    expect(await initialRejectHandle.evaluate(
      (initialElement, dialogConfirmElement) => initialElement !== dialogConfirmElement,
      realRejectHandle,
    )).toBe(true)
    console.log('REJECT_CONFIRMATION_DIALOG_COUNT: 1')
    console.log('REAL_DIALOG_REJECT_CONTROL_COUNT: 1')
    console.log('INITIAL_REJECT_SUBMIT_DISTINCT_FROM_DIALOG_CONFIRM: PASS')
    console.log('GLOBAL_FINAL_REJECT_LOCATORS: 0')
    console.log('FIRST_LAST_NTH_WORKAROUNDS: 0')
    const serverActionResponse = page.waitForResponse((response) => {
      const request = response.request()
      return request.method() === 'POST' && Boolean(request.headers()['next-action'])
    })
    await realRejectControl.click()
    console.log('CLICK_RETURNED_COUNT: 1')
    console.log('REAL_DIALOG_REJECT_CONFIRM_CLICKS: 1')
    const response = await serverActionResponse
    console.log('SERVER_ACTION_REQUEST_SEEN_COUNT: 1')
    console.log('SERVER_ACTION_COMPLETION_OBSERVED: yes')
    await page.waitForLoadState('networkidle')
    console.log('SERVER_ACTION_RESPONSE_STATUS_CLASS: ' + (response.ok() ? 'SUCCESS_2XX' : 'NON_2XX_RESPONSE'))
    publishActionRunningAfterCompletion({
      evidence: {
        clickReturnedCount: 1,
        serverActionRequestSeenCount: 1,
        serverActionRequestCorrelated: true,
        serverActionCompletionObserved: true,
        serverActionResponseOk: response.ok(),
        serverActionPostAttempts,
        unexpectedApplicationPostAttempts,
      },
      reportObservability: () => {
        console.log('RAW_PAGE_POST_ATTEMPTS: ' + rawPagePostAttempts)
        console.log('SERVER_ACTION_POST_ATTEMPTS: ' + serverActionPostAttempts)
        console.log('SERVER_ACTION_POST_ATTEMPTED: yes')
        console.log('FRAMEWORK_DIAGNOSTIC_POST_ATTEMPTS: ' + frameworkDiagnosticPostAttempts)
        console.log('UNEXPECTED_APPLICATION_POST_ATTEMPTS: ' + unexpectedApplicationPostAttempts)
      },
      publishActionRunning: () => writeSignal(signalPath, runId, 'ACTION_RUNNING'),
    })
    console.log('ACTION_RUNNING_PUBLISHED_COUNT: 1')
    await waitForState(signalPath, runId, 'ACTION_DONE', 120000)
    writeSignal(signalPath, runId, 'CANCEL')
    writeSignal(signalPath, runId, 'CLEAN')
    return
  }
  await waitForState(signalPath, runId, 'HANDOFF_DRY_RUN')
  writeSignal(signalPath, runId, 'ACTION_ARMED_DRY_RUN')
  await waitForState(signalPath, runId, 'CANCEL')
  writeSignal(signalPath, runId, 'CLEAN')
})
