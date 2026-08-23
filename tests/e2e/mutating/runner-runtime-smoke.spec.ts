import { expect, test } from '@playwright/test'

test('runtime smoke autenticado sin mutacion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-admin', 'runtime smoke usa admin')

  await page.goto('/dashboard/solicitudes')
  await expect(page).toHaveURL(/\/dashboard\/solicitudes$/)
  await expect(page.getByPlaceholder('Buscar por solicitante, correo, propósito, ítem o código patrimonial')).toBeVisible()
})
