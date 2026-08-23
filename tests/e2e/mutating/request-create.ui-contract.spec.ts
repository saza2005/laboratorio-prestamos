import { expect, test } from '@playwright/test'
import { prepareFlowR1RequestForm } from './helpers/request-create-form'

function dummyDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 10)
}

test('verifica el formulario completo FLOW-R1 sin mutar datos', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-student', 'FLOW-R1 usa student')

  await prepareFlowR1RequestForm(page, {
    purpose: 'E2E_UI_CONTRACT_DUMMY',
    comments: 'Ensayo local de contrato UI',
    scheduledReturnDate: dummyDate(),
  })

  const submit = page.getByRole('button', {
    name: 'Enviar solicitud',
    exact: true,
  })
  await expect(submit).toBeVisible()
  await expect(submit).toBeEnabled()
})
