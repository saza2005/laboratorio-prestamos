import { expect, type ElementHandle, type Page } from '@playwright/test'

export type FlowR3ApproveData = {
  searchTerm: string
}

export async function prepareFlowR3ApproveAction(page: Page, data: FlowR3ApproveData): Promise<{
  initialApprove: ReturnType<Page['getByRole']>
  initialElementHandle: ElementHandle<HTMLElement | SVGElement>
  realConfirm: ReturnType<Page['getByRole']>
}> {
  await page.goto('/dashboard/solicitudes')
  await expect(page).toHaveURL(/\/dashboard\/solicitudes$/)
  const search = page.getByPlaceholder('Buscar por solicitante, correo, propósito, ítem o código patrimonial')
  await expect(search).toBeVisible()
  await search.fill(data.searchTerm)
  const requestRow = page.locator('div.divide-y > button').filter({ hasText: data.searchTerm })
  await expect(requestRow).toHaveCount(1)
  await expect(requestRow).toBeVisible()
  await requestRow.click()
  const approveForm = page.locator('form').filter({ has: page.locator('input[name="request_item_id"]') })
  await expect(approveForm).toHaveCount(1)
  const initialApprove = approveForm.getByRole('button', { name: /^Aprobar(?: solicitud completa)?$/i })
  await expect(initialApprove).toHaveCount(1)
  await expect(initialApprove).toBeVisible()
  await expect(initialApprove).toBeEnabled()
  const initialElementHandle = await initialApprove.elementHandle()
  if (!initialElementHandle) throw new Error('initial_approve_handle_missing_before_click')
  const confirmationDialogBeforeClick = page.getByRole('dialog', { name: 'Aprobar solicitud' })
  await expect(confirmationDialogBeforeClick).toHaveCount(0)
  await initialApprove.click()
  const confirmationDialog = page.getByRole('dialog', { name: 'Aprobar solicitud' })
  await expect(confirmationDialog).toHaveCount(1)
  const realConfirm = confirmationDialog.getByRole('button', { name: /^Aprobar$/i })
  await expect(realConfirm).toHaveCount(1)
  await expect(realConfirm).toBeVisible()
  await expect(realConfirm).toBeEnabled()
  return { initialApprove, initialElementHandle, realConfirm }
}
