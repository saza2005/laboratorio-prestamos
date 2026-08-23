import { expect, test } from '@playwright/test'
import { prepareFlowR2RejectAction } from './helpers/request-reject-action'

test('rechaza exactamente una solicitud efimera FLOW-R2', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-admin', 'FLOW-R2 usa admin')

  await prepareFlowR2RejectAction(page, {
    searchTerm: 'E2E_MUT_REQ_R2_',
    rejectionReason: 'E2E_MUT_REQ_R2_REJECTION',
  })

  const confirm = page.getByRole('button', { name: 'Rechazar', exact: true })
  await expect(confirm).toBeVisible()
  await confirm.click()
})
