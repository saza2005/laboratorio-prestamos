import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { classifyPagePost } from '../../../scripts/e2e/lib/post-request-classifier.mjs'
import { makeSanitizedPostRecord, writeSanitizedCapture } from '../../../scripts/e2e/lib/sanitized-post-capture.mjs'
import { atomicWriteHandshake, readHandshake, validateHandshake, validateHandshakeTransition } from '../../../scripts/e2e/lib/runtime-handshake.mjs'
import { resolveBulkQuantityControl } from './helpers/deliver-request-action'

const runtimeDir = process.env.E2E_RUNTIME_DIR
const runId = process.env.E2E_RUNTIME_RUN_ID
const capturePath = process.env.E2E_POST_CAPTURE_FILE
if (!runtimeDir || !runId || !capturePath) throw new Error('missing_l1_runtime_environment')
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
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    const state = readHandshake(runId)?.state
    if (state === 'ABORT') throw new Error('runtime_aborted')
    if (state === expected) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('runtime_handshake_timeout_' + expected.toLowerCase())
}

test('L1-B prepara entrega sin ejecutar delivery', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-lab-staff', 'L1 usa lab_staff')
  const records: Array<Record<string, unknown>> = []
  const startedAt = process.hrtime.bigint()
  let postAttempts = 0

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
    const record = makeSanitizedPostRecord({
      ordinal: postAttempts,
      elapsedMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      phase: 'BEFORE_DELIVERY_CONFIRM',
      request,
      pageOrigin: pageUrl.origin,
      classifierResult: classification,
    })
    record.blocked_by_kill_switch = true
    record.reached_next = false
    records.push(record)
    writeSanitizedCapture(capturePath, records)
    await route.abort('blockedbyclient')
  })

  await page.goto('/dashboard')
  await expect(page.getByText('Rol: Laboratorista', { exact: true })).toHaveCount(1)
  await page.goto('/dashboard/solicitudes')
  await expect(page).toHaveURL(/\/dashboard\/solicitudes$/)
  await expect(page.getByPlaceholder('Buscar por solicitante, correo, propósito, ítem o código patrimonial')).toBeVisible()
  writeSignal('BROWSER_READY')
  await waitForState('FIXTURE_READY')

  const snapshot = JSON.parse(fs.readFileSync('.e2e-state/runtime/l1-b-snapshot.json', 'utf8'))
  await page.goto('/dashboard/solicitudes')
  const search = page.getByPlaceholder('Buscar por solicitante, correo, propósito, ítem o código patrimonial')
  await search.fill(snapshot.purpose)
  const requestRow = page.locator('div.divide-y > button').filter({ hasText: snapshot.purpose })
  await expect(requestRow).toHaveCount(1)
  await requestRow.click()

  const detail = page.getByRole('dialog', { name: 'Detalle', exact: true })
  await expect(detail).toHaveCount(1)
  const deliveryForm = detail.locator('form')
  await expect(deliveryForm).toHaveCount(1)
  const quantity = resolveBulkQuantityControl(deliveryForm, snapshot.referenceAliases.item)
  await expect(quantity).toHaveCount(1)
  await expect(quantity).toHaveValue('1')
  const initial = deliveryForm.getByRole('button', { name: 'Confirmar entrega y crear préstamo', exact: true })
  await expect(initial).toHaveCount(1)
  await expect(initial).toBeVisible()
  await expect(initial).toBeEnabled()
  writeSignal('ACTION_ARMED')
  await waitForState('CANCEL')
  writeSignal('CLEAN')
  return
})
