import { expect, type Locator, type Page } from '@playwright/test'

export type FlowR2RejectData = {
  searchTerm: string
  rejectionReason: string
}

export async function prepareFlowR2RejectAction(
  page: Page,
  data: FlowR2RejectData
): Promise<{ detailDialog: Locator; initialRejectControl: Locator }> {
  await page.goto('/dashboard/solicitudes')
  await expect(page).toHaveURL(/\/dashboard\/solicitudes$/)

  const search = page.getByPlaceholder(
    'Buscar por solicitante, correo, propósito, ítem o código patrimonial'
  )
  await expect(search).toBeVisible()
  await search.fill(data.searchTerm)

  const requestRow = page.locator('div.divide-y > button').filter({ hasText: data.searchTerm })
  await expect(requestRow).toHaveCount(1)
  await expect(requestRow).toBeVisible()
  await requestRow.click()

  const detailDialog = page.getByRole('dialog', { name: 'Detalle', exact: true })
  await expect(detailDialog).toHaveCount(1)
  const form = detailDialog.locator('form').filter({
    has: page.locator('textarea[name="rejection_reason"]'),
  })
  const reason = form.locator('textarea[name="rejection_reason"]')
  await expect(reason).toBeVisible()
  await reason.fill(data.rejectionReason)
  await expect(reason).toHaveValue(data.rejectionReason)

  const initialRejectControl = form.locator('button[type="submit"]')
  await expect(initialRejectControl).toHaveCount(1)
  await expect(initialRejectControl).toBeVisible()
  await expect(initialRejectControl).toBeEnabled()
  return { detailDialog, initialRejectControl }
}
