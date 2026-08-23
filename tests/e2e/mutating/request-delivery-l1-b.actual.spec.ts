import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { atomicWriteHandshake, readHandshake, validateHandshake, validateHandshakeTransition } from '../../../scripts/e2e/lib/runtime-handshake.mjs'
import { resolveBulkQuantityControl, resolveDeliveryConfirmationDialog, resolveInitialDeliveryControl, resolveRealDeliveryControl } from './helpers/deliver-request-action'

const runtimeDir = process.env.E2E_RUNTIME_DIR
const runId = process.env.E2E_RUNTIME_RUN_ID
const capturePath = process.env.E2E_POST_CAPTURE_FILE
if (!runtimeDir || !runId || !capturePath) throw new Error('missing_l1_runtime_environment')
const signalPath = `${runtimeDir}/${runId}.json`
const observabilityPath = `${runtimeDir}/${runId}.delivery-observability.json`
const protocolAuditPath = `${runtimeDir}/l1-b-protocol-audit.jsonl`
const observability = [] as Array<{ ordinal: number; marker: string; elapsed_ms: number }>
const observabilityStartedAt = process.hrtime.bigint()

function writeObservation(marker: string) {
  observability.push({
    ordinal: observability.length + 1,
    marker,
    elapsed_ms: Number(process.hrtime.bigint() - observabilityStartedAt) / 1_000_000,
  })
  fs.appendFile(observabilityPath, JSON.stringify(observability.at(-1)) + '\n', { mode: 0o600 }, () => {})
}
function appendProtocolAudit(marker: string) {
  fs.appendFileSync(protocolAuditPath, JSON.stringify({ sequence: `${Date.now()}-${process.hrtime.bigint()}`, actor: 'F3IG', marker }) + '\n', { mode: 0o600 })
}
const eventPath = `${runtimeDir}/${runId}.delivery.json`

function writeSignal(state: string) {
  const value = { version: 1, project: 'e2e', run_id: runId, state }
  validateHandshake(value, runId)
  if (fs.existsSync(signalPath)) {
    const previous = JSON.parse(fs.readFileSync(signalPath, 'utf8'))
    validateHandshake(previous, runId)
    validateHandshakeTransition(previous.state, state)
  } else validateHandshakeTransition(null, state)
  atomicWriteHandshake(value)
}
function readEvent() { return fs.existsSync(eventPath) ? JSON.parse(fs.readFileSync(eventPath, 'utf8')).state : null }
function writeEvent(state: string) {
  const order = ['BROWSER_READY', 'FIXTURE_READY', 'ACTION_ARMED', 'INITIAL_CONFIRMATION_TRIGGERED', 'FINAL_DELIVERY_ARMED', 'EMAIL_PROVIDER_DISABLED_PROVEN', 'DELIVERY_SUBMIT_AUTHORIZED', 'DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED', 'CLEANUP_REQUIRED', 'COMPLETE']
  const previous = readEvent()
  if (previous && order.indexOf(state) <= order.indexOf(previous)) throw new Error('delivery_event_order_invalid')
  const temp = `${eventPath}.tmp-${process.pid}`
  fs.writeFileSync(temp, JSON.stringify({ version: 1, project: 'e2e', run_id: runId, state }) + '\n', { mode: 0o600 })
  fs.renameSync(temp, eventPath)
}
async function waitForEvent(expected: string) {
  const order = ['BROWSER_READY', 'FIXTURE_READY', 'ACTION_ARMED', 'INITIAL_CONFIRMATION_TRIGGERED', 'FINAL_DELIVERY_ARMED', 'EMAIL_PROVIDER_DISABLED_PROVEN', 'DELIVERY_SUBMIT_AUTHORIZED', 'DELIVERY_SUBMIT_ATTEMPTED', 'DELIVERY_RESULT_OBSERVED', 'CLEANUP_REQUIRED', 'COMPLETE']
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    const state = readEvent()
    if (state === 'ABORT') throw new Error('runtime_aborted')
    if (state === expected) return
    if (order.indexOf(state) > order.indexOf(expected)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('delivery_event_timeout_' + expected.toLowerCase())
}

test('L1-B ejecuta exactamente una entrega real con aislamiento de correo', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-lab-staff', 'L1 usa lab_staff')
  let deliveryServerActionPosts = 0
  let deliveryAuthorizationSeen = false
  await page.route('**/*', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    const headers = request.headers()
    const isServerAction = Boolean(headers['next-action'])
    if (!isServerAction || !deliveryAuthorizationSeen || deliveryServerActionPosts >= 1) return route.abort('blockedbyclient')
    deliveryServerActionPosts += 1
    writeObservation('DELIVERY_POST_REQUEST_OBSERVED')
    try {
      await route.continue()
    } catch (error) {
      writeObservation('DELIVERY_POST_REQUEST_FAILED')
      throw error
    }
  })

  await page.goto('/dashboard')
  await expect(page.getByText('Rol: Laboratorista', { exact: true })).toHaveCount(1)
  await page.goto('/dashboard/solicitudes')
  await expect(page).toHaveURL(/\/dashboard\/solicitudes$/)
  await expect(page.getByPlaceholder('Buscar por solicitante, correo, propósito, ítem o código patrimonial')).toBeVisible()
  writeSignal('BROWSER_READY')
  writeEvent('BROWSER_READY')
  await waitForEvent('FIXTURE_READY')
  await page.reload()

  const snapshot = JSON.parse(fs.readFileSync('.e2e-state/runtime/l1-b-snapshot.json', 'utf8'))
  if (!snapshot.requestId || snapshot.fixtureReady !== true) throw new Error('fixture_ready_state_invalid')
  const search = page.getByPlaceholder('Buscar por solicitante, correo, propósito, ítem o código patrimonial')
  await search.fill(snapshot.purpose)
  const requestRow = page.locator('div.divide-y > button').filter({ hasText: snapshot.purpose })
  await expect(requestRow).toHaveCount(1)
  await requestRow.click()
  const detail = page.getByRole('dialog', { name: 'Detalle', exact: true })
  await expect(detail).toHaveCount(1)
  const form = detail.locator('form')
  const quantity = resolveBulkQuantityControl(form, snapshot.referenceAliases.item)
  await expect(quantity).toHaveValue('1')
  const initial = resolveInitialDeliveryControl(page)
  await expect(initial).toHaveCount(1)
  await expect(initial).toBeVisible()
  await expect(initial).toBeEnabled()
  writeSignal('ACTION_ARMED')
  appendProtocolAudit('F3IG_ACTION_ARMED_WRITE_STARTED')
  writeEvent('ACTION_ARMED')
  appendProtocolAudit('F3IG_ACTION_ARMED_WRITE_COMPLETED')
  await initial.click()
  writeEvent('INITIAL_CONFIRMATION_TRIGGERED')
  const confirmation = resolveDeliveryConfirmationDialog(page)
  await expect(confirmation).toHaveCount(1)
  const final = resolveRealDeliveryControl(confirmation)
  await expect(final).toHaveCount(1)
  await expect(final).toBeVisible()
  await expect(final).toBeEnabled()
  writeEvent('FINAL_DELIVERY_ARMED')
  await waitForEvent('EMAIL_PROVIDER_DISABLED_PROVEN')
  appendProtocolAudit('F3IG_AUTH_WAIT_STARTED')
  await waitForEvent('DELIVERY_SUBMIT_AUTHORIZED')
  deliveryAuthorizationSeen = true
  appendProtocolAudit('F3IG_AUTHORIZATION_OBSERVED')
  if (deliveryServerActionPosts !== 0) throw new Error('delivery_submit_prearmed')
  const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST' && Boolean(response.request().headers()['next-action']))
  appendProtocolAudit('F3IG_FINAL_CLICK_CALL_STARTED')
  writeObservation('FINAL_CLICK_CALL_STARTED')
  try {
    await final.click()
    appendProtocolAudit('F3IG_FINAL_CLICK_CALL_RESOLVED')
    writeObservation('FINAL_CLICK_CALL_RESOLVED')
  } catch (error) {
    writeObservation('FINAL_CLICK_CALL_FAILED')
    throw error
  }
  writeEvent('DELIVERY_SUBMIT_ATTEMPTED')
  await responsePromise
  writeObservation('DELIVERY_POST_RESPONSE_OBSERVED')
  if (deliveryServerActionPosts !== 1) throw new Error('delivery_server_action_count_mismatch')
  writeEvent('DELIVERY_RESULT_OBSERVED')
  await waitForEvent('CLEANUP_REQUIRED')
  writeSignal('ACTION_RUNNING')
  writeSignal('ACTION_DONE')
  writeSignal('CLEAN')
})
