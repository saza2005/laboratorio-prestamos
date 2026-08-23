import { expect, type Page } from '@playwright/test'

export type FlowR1FormData = {
  purpose: string
  comments: string
  scheduledReturnDate: string
}

export async function prepareFlowR1RequestForm(
  page: Page,
  data: FlowR1FormData,
): Promise<void> {
  await page.goto('/solicitudes/nueva')

  const purpose = page.locator('input[name="purpose"]')
  const comments = page.locator('textarea[name="comments"]')
  const scheduledReturnDate = page.locator(
    'input[name="scheduled_return_date"]',
  )

  await expect(purpose).toBeVisible()
  await expect(comments).toBeVisible()
  await expect(scheduledReturnDate).toBeVisible()

  const itemButton = page.getByRole('button', { name: /E2E_ITEM_BULK/ })
  await expect(itemButton).toBeVisible()
  await itemButton.click()

  const quantity = page.locator('input[type="number"]')
  await expect(quantity).toBeVisible()
  await quantity.fill('1')

  await purpose.fill(data.purpose)
  await comments.fill(data.comments)
  await scheduledReturnDate.fill(data.scheduledReturnDate)

  await expect(purpose).toHaveValue(data.purpose)
  await expect(comments).toHaveValue(data.comments)
  await expect(scheduledReturnDate).toHaveValue(data.scheduledReturnDate)
  await expect(quantity).toHaveValue('1')

  const form = page.locator('form').first()
  const formValid = await form.evaluate((element) => {
    return (element as HTMLFormElement).checkValidity()
  })
  expect(formValid).toBe(true)

  const submit = page.getByRole('button', {
    name: 'Enviar solicitud',
    exact: true,
  })
  await expect(submit).toBeVisible()
  await expect(submit).toBeEnabled()
}
