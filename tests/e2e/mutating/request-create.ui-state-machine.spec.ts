import { expect, test, type Page } from '@playwright/test'

type UiState = {
  pathname: string
  item: boolean
  quantity: boolean
  purpose: boolean
  comments: boolean
  date: boolean
  submit: boolean
  loading: boolean
  error: boolean
}

async function capture(page: Page): Promise<UiState> {
  const pathname = new URL(page.url()).pathname
  return {
    pathname,
    item: await page.getByRole('button', { name: /E2E_ITEM_BULK/ }).count() > 0,
    quantity: await page.locator('input[type="number"]').count() > 0,
    purpose: await page.locator('input[name="purpose"]').count() > 0,
    comments: await page.locator('textarea[name="comments"]').count() > 0,
    date: await page.locator('input[name="scheduled_return_date"]').count() > 0,
    submit: await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).count() > 0,
    loading: await page.getByText('Cargando', { exact: true }).count() > 0,
    error: await page.locator('[role="alert"]').count() > 0,
  }
}

test('diagnostica la maquina de estados UI de FLOW-R1 sin mutar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-student', 'FLOW-R1 usa student')

  await page.goto('/solicitudes/nueva')
  await expect(page.locator('body')).toBeVisible()

  const state0 = await capture(page)
  console.log('STATE_0: ' + JSON.stringify(state0))
  if (state0.pathname !== '/solicitudes/nueva') throw new Error('unexpected_final_pathname')

  const itemButton = page.getByRole('button', { name: /E2E_ITEM_BULK/ })
  await expect(itemButton).toBeVisible()
  await itemButton.click()

  const state1 = await capture(page)
  console.log('STATE_1: ' + JSON.stringify(state1))

  const quantity = page.locator('input[type="number"]')
  await expect(quantity).toBeVisible()
  await quantity.fill('1')

  const purpose = page.locator('input[name="purpose"]')
  const comments = page.locator('textarea[name="comments"]')
  const date = page.locator('input[name="scheduled_return_date"]')
  await purpose.fill('E2E_UI_REHEARSAL')
  await comments.fill('E2E UI rehearsal')
  await date.fill('2099-01-01')

  const ready = await capture(page)
  const form = page.locator('form').first()
  const valid = await form.evaluate((element) => (element as HTMLFormElement).checkValidity())
  console.log('READY_TO_SUBMIT: ' + JSON.stringify({ ...ready, form_valid: valid }))
  await expect(purpose).toHaveValue('E2E_UI_REHEARSAL')
  await expect(comments).toHaveValue('E2E UI rehearsal')
  await expect(date).toHaveValue('2099-01-01')
  await expect(quantity).toHaveValue('1')
  await expect(page.getByRole('button', { name: 'Enviar solicitud', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar solicitud', exact: true })).toBeEnabled()
})
