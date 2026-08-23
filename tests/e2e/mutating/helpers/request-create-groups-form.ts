import fs from 'node:fs'
import { expect, type Page } from '@playwright/test'

type R4ReferenceState = {
  profiles: { profiles: { e2e_student: { id: string } } }
  data: { records: { E2E_ITEM_BULK: { id: string } } }
}

function readReferences(): R4ReferenceState {
  const profiles = JSON.parse(fs.readFileSync('.e2e-state/profiles.json', 'utf8'))
  const data = JSON.parse(fs.readFileSync('.e2e-state/test-data.json', 'utf8'))
  return { profiles, data }
}

export async function prepareR4GroupedRequestForm(page: Page, purpose: string): Promise<void> {
  const references = readReferences()
  const studentId = references.profiles.profiles.e2e_student.id
  const itemId = references.data.records.E2E_ITEM_BULK.id

  await page.goto('/solicitudes/grupal')
  await expect(page.getByRole('heading', { name: 'Nueva solicitud grupal', exact: true })).toHaveCount(1)

  const form = page.locator('form')
  await expect(form).toHaveCount(1)

  const purposeControl = form.locator('input[name="purpose"]')
  await expect(purposeControl).toHaveCount(1)
  await expect(purposeControl).toBeEditable()
  await purposeControl.fill(purpose)
  await expect(purposeControl).toHaveValue(purpose)

  const groupName = form.locator('input[name="groups[0][group_name]"]')
  await expect(groupName).toHaveCount(1)
  await expect(groupName).toHaveValue('Grupo 1')

  const leader = form.locator(`select:has(option[value="${studentId}"])`)
  await expect(leader).toHaveCount(1)
  await leader.selectOption(studentId)
  await expect(leader).toHaveValue(studentId)

  const itemButton = page.getByRole('button', { name: /E2E_ITEM_BULK/ })
  await expect(itemButton).toHaveCount(1)
  await itemButton.click()

  const quantity = form.locator('input[type="number"]')
  await expect(quantity).toHaveCount(1)
  await quantity.fill('1')
  await expect(quantity).toHaveValue('1')

  const itemInput = form.locator('input[name="groups[0][items][0][item_id]"]')
  const quantityInput = form.locator('input[name="groups[0][items][0][quantity]"]')
  await expect(itemInput).toHaveCount(1)
  await expect(quantityInput).toHaveCount(1)
  await expect(itemInput).toHaveValue(itemId)
  await expect(quantityInput).toHaveValue('1')

  const payload = await form.evaluate((element) => {
    const data = new FormData(element as HTMLFormElement)
    return {
      purpose: data.get('purpose'),
      groupNames: data.getAll('groups[0][group_name]'),
      leaders: data.getAll('groups[0][leader_student_id]'),
      itemIds: data.getAll('groups[0][items][0][item_id]'),
      quantities: data.getAll('groups[0][items][0][quantity]'),
    }
  })

  expect(payload.purpose).toBe(purpose)
  expect(payload.groupNames).toEqual(['Grupo 1'])
  expect(payload.leaders).toEqual([studentId])
  expect(payload.itemIds).toEqual([itemId])
  expect(payload.quantities).toEqual(['1'])

  const submit = page.getByRole('button', {
    name: 'Enviar solicitud con grupos',
    exact: true,
  })
  await expect(submit).toHaveCount(1)
  await expect(submit).toBeVisible()
  await expect(submit).toBeEnabled()
}
