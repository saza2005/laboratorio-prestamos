import fs from "node:fs"
import { expect, test } from '@playwright/test'
import { prepareFlowR2RejectAction } from './helpers/request-reject-action'

test('verifica la accion de rechazo FLOW-R2 sin mutar datos', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-admin', 'FLOW-R2 usa admin')

  await prepareFlowR2RejectAction(page, {
    searchTerm: JSON.parse(fs.readFileSync('.e2e-state/mutating-tests.json', 'utf8')).flows['FLOW-R2'].correlation_marker,
    rejectionReason: 'E2E_UI_REJECT_REHEARSAL',
  })

  const confirm = page.getByRole('button', { name: 'Rechazar', exact: true })
  await expect(confirm).toBeVisible()
  await expect(confirm).toBeEnabled()
})
