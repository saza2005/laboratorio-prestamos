import { expect, test } from '@playwright/test'
import { loadState, registerCreatedEntity } from '../../../scripts/e2e/lib/mutating-state.mjs'
import { prepareFlowR1RequestForm } from './helpers/request-create-form'

function futureDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 10)
}

test.describe('FLOW-R1 @mutating', () => {
  test('crea una solicitud individual efimera', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-student', 'FLOW-R1 usa student')
    const flow = loadState().flows['FLOW-R1']
    const marker = flow?.correlation_marker
    if (!marker) throw new Error('correlation_marker_missing')

    await prepareFlowR1RequestForm(page, {
      purpose: marker,
      comments: 'Solicitud de escenario mutante FLOW-R1',
      scheduledReturnDate: futureDate(),
    })

    await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click()
    await expect(page).toHaveURL(/\/solicitudes$/)
    await page.goto('/solicitudes/mis-solicitudes')
    const search = page.getByPlaceholder('Buscar por propósito, ítem, código o tipo')
    await search.fill(marker)
    const row = page.getByRole('button').filter({ hasText: marker }).first()
    await expect(row).toBeVisible()
    await row.click()
    const requestId = await page.locator('input[name="request_id"]').inputValue()
    if (!requestId) throw new Error('created_request_id_not_found')
    registerCreatedEntity('FLOW-R1', 'request', requestId)
    await expect(page.getByText('Pendiente', { exact: true })).toBeVisible()
  })
})
