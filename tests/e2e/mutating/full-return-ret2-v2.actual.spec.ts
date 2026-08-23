import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'

const auditPath = '.e2e-state/runtime/ret2-full-return-protocol-audit.jsonl'
let sequence = 0
async function audit(marker: string) {
  sequence += 1
  await fs.appendFile(auditPath, JSON.stringify({ sequence, attemptOrdinal: 2, timestamp: new Date().toISOString(), actor: 'F3IG_RET2_ATTEMPT2', marker }) + '\n', { mode: 0o600 })
}
function escaped(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

test('RET2 attempt two full return bulk quantity one', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-lab-staff', 'RET2 requires lab staff project')
  const state = JSON.parse(await fs.readFile('.e2e-state/runtime/ret2-full-return-snapshot.json', 'utf8'))
  expect(state.status).toBe('ACTIVE_FIXTURE')
  let submissions = 0
  page.on('request', (request) => { if (request.method() === 'POST' && Boolean(request.headers()['next-action'])) submissions += 1 })
  await page.goto('/devoluciones')
  await expect(page).toHaveURL(/\/devoluciones(?:\?.*)?$/)
  await audit('RET2_FIXTURE_READY')
  const pendingTab = page.getByRole('tab', { name: 'Pendientes', exact: true })
  await expect(pendingTab).toHaveCount(1)
  await pendingTab.click()
  const loanRow = page.getByRole('button', { name: new RegExp(escaped(state.fixture.loanId)) })
  await expect(loanRow).toHaveCount(1)
  await loanRow.click()
  const drawer = page.getByRole('dialog', { name: 'Detalle', exact: true })
  await expect(drawer).toHaveCount(1)
  const fullReturn = drawer.getByRole('button', { name: 'Devolución completa', exact: true })
  await expect(fullReturn).toHaveCount(1)
  await expect(drawer.getByText('Devolver préstamo completo', { exact: true })).toHaveCount(1)
  await expect(drawer.getByText(/Pendiente total:\s*1/)).toHaveCount(1)
  await audit('RET2_RETURN_FORM_READY')
  await fullReturn.click()
  const confirmation = page.getByRole('dialog', { name: 'Registrar devolución completa', exact: true })
  await expect(confirmation).toHaveCount(1)
  await audit('RET2_CONFIRMATION_OPENED')
  await audit('RET2_ACTION_ARMED')
  const finalSubmit = confirmation.getByRole('button', { name: 'Registrar completa', exact: true })
  await expect(finalSubmit).toHaveCount(1)
  const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST' && Boolean(response.request().headers()['next-action']))
  await audit('RET2_FINAL_SUBMIT_STARTED')
  await finalSubmit.click()
  const response = await responsePromise
  expect(response.ok()).toBeTruthy()
  expect(submissions).toBe(1)
  await audit('RET2_SERVER_ACTION_SUBMISSION_REACHED')
  await expect(page).toHaveURL(/\/devoluciones(?:\?.*)?$/)
  await audit('RET2_FINAL_SUBMIT_RESOLVED')
  await audit('RET2_REMOTE_WRITE_LOCAL_RESULT_OBSERVED')
})
