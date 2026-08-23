import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const runtimeStem = process.env.E2E_RUNTIME_RET1_STEM || 'ret1-partial-return'
const auditPath = `.e2e-state/runtime/${runtimeStem}-protocol-audit.jsonl`
function audit(marker: string) {
  fs.appendFileSync(auditPath, JSON.stringify({ sequence: `${Date.now()}-${process.hrtime.bigint()}`, actor: 'F3IG_RET1', marker }) + '\n', { mode: 0o600 })
}

test('FLOW-RET1 partial bulk return quantity one', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-lab-staff', 'RET1 uses lab_staff')
  const snapshot = JSON.parse(fs.readFileSync(`.e2e-state/runtime/${runtimeStem}-snapshot.json`, 'utf8'))
  expect(snapshot.status).toBe('ACTIVE_FIXTURE')
  let serverActionSubmissions = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) serverActionSubmissions += 1
  })

  await page.goto('/devoluciones')
  await expect(page).toHaveURL(/\/devoluciones$/)
  const form = page.locator('main form').first()
  const loanItemSelect = form.locator('select').first()
  await expect(loanItemSelect).toBeVisible()
  await expect(form.getByText('Resumen del ítem', { exact: true })).toBeVisible()
  await expect(form.getByText('Cantidades de la devolución', { exact: true })).toBeVisible()
  await expect(form.getByText('Las opciones se habilitarán después de seleccionar un ítem.')).toBeVisible()
  await expect(form.locator('input[name="quantity_ok"]')).toHaveCount(0)
  await loanItemSelect.selectOption(snapshot.fixture.loanItemId)
  await expect(form.getByText('Resumen del ítem seleccionado', { exact: true })).toBeVisible()
  await expect(form.getByText('Cantidades de la devolución', { exact: true })).toBeVisible()
  await expect(form.locator('input[name="quantity_ok"]')).toBeVisible()
  await form.locator('input[name="quantity_ok"]').fill('1')
  await form.locator('input[name="quantity_damaged"]').fill('0')
  await form.locator('input[name="quantity_missing"]').fill('0')
  await form.locator('textarea[name="notes"]').fill(snapshot.ownership)
  audit('RET1_FIXTURE_READY')
  audit('RET1_RETURN_FORM_READY')
  const submit = form.getByRole('button', { name: 'Registrar devolución', exact: true })
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  audit('RET1_CONFIRMATION_OPENED')
  audit('RET1_ACTION_ARMED')
  const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST' && Boolean(response.request().headers()['next-action']))
  audit('RET1_FINAL_SUBMIT_STARTED')
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar', exact: true }).click()
  await responsePromise
  expect(serverActionSubmissions).toBe(1)
  audit('RET1_SERVER_ACTION_SUBMISSION_REACHED')
  audit('RET1_FINAL_SUBMIT_RESOLVED')
  await expect(page).toHaveURL(/\/devoluciones$/)
  audit('RET1_REMOTE_WRITE_LOCAL_RESULT_OBSERVED')
})
