import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const auditPath = '.e2e-state/runtime/l2-direct-loan-protocol-audit.jsonl'
function audit(marker: string) {
  fs.appendFileSync(auditPath, JSON.stringify({ sequence: `${Date.now()}-${process.hrtime.bigint()}`, actor: 'F3IG_L2', marker }) + '\n', { mode: 0o600 })
}

test('FLOW-L2 direct loan bulk quantity one', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-lab-staff', 'FLOW-L2 uses lab_staff')
  const snapshot = JSON.parse(fs.readFileSync('.e2e-state/runtime/l2-direct-loan-snapshot.json', 'utf8'))
  expect(snapshot.status).toBe('ACTIVE_FIXTURE')
  let serverActionSubmissions = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) serverActionSubmissions += 1
  })
  await page.goto('/prestamos')
  await expect(page).toHaveURL(/\/prestamos$/)
  const borrowerSelect = page.locator('select[name="user_id"]')
  await expect(borrowerSelect).toBeVisible()
  await borrowerSelect.selectOption(snapshot.borrowerId)
  const itemButton = page.getByRole('button', { name: new RegExp(snapshot.fixture.itemCode) })
  await expect(itemButton).toHaveCount(1)
  await itemButton.click()
  await expect(page.getByText('Materiales agregados', { exact: true })).toBeVisible()
  await expect(page.locator('input[name="items[0][quantity]"]')).toHaveValue('1')
  await page.locator('textarea[name="notes"]').fill(snapshot.ownership)
  audit('L2_FIXTURE_READY')
  const submit = page.getByRole('button', { name: 'Guardar préstamo', exact: true })
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  audit('L2_CONFIRMATION_OPENED')
  audit('L2_ACTION_ARMED')
  const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST' && Boolean(response.request().headers()['next-action']))
  audit('L2_FINAL_SUBMIT_STARTED')
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar', exact: true }).click()
  await responsePromise
  expect(serverActionSubmissions).toBe(1)
  audit('L2_FINAL_SUBMIT_RESOLVED')
  audit('L2_SERVER_ACTION_SUBMISSION_REACHED')
  await expect(page).toHaveURL(/\/prestamos$/)
  audit('L2_REMOTE_WRITE_LOCAL_RESULT_OBSERVED')
})
