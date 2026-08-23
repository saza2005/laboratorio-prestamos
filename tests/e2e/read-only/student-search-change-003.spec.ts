import { expect, test, type Page } from '@playwright/test'

const impossibleSearch = 'change-003-no-result-9f84c2d1'

function invertCase(value: string) {
  return Array.from(value, (character) => {
    const upper = character.toUpperCase()
    const lower = character.toLowerCase()
    return character === upper ? lower : upper
  }).join('')
}

function guardAgainstServerActionWrites(page: Page) {
  let submissions = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) {
      submissions += 1
    }
  })
  return () => expect(submissions, 'No Server Action may be submitted').toBe(0)
}

test('CHANGE-003 filtra prestatarios sin enviar el formulario', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-lab-staff', 'Uses the authorized lab_staff state')
  const assertNoWrites = guardAgainstServerActionWrites(page)

  await page.goto('/prestamos')
  await expect(page).toHaveURL(/\/prestamos$/)

  const search = page.getByRole('searchbox', { name: 'Buscar estudiante o docente' })
  const select = page.getByRole('combobox', { name: 'Usuario' })
  await expect(search).toBeVisible()
  await expect(select).toBeVisible()

  const allOptions = await select.locator('option:not([value=""])').allTextContents()
  expect(allOptions.length, 'The authorized page must expose at least one candidate').toBeGreaterThan(0)
  const plusOption = allOptions.find((text) => text.includes('+'))
  expect(Boolean(plusOption), 'A controlled candidate with a plus-address must be available').toBe(true)

  const match = plusOption?.match(/^(.*?) · (.*?) \([^)]*\)$/)
  expect(Boolean(match), 'Candidate text must expose name and email using the product format').toBe(true)
  const candidateName = match?.[1].trim() ?? ''
  const candidateEmail = match?.[2].trim() ?? ''
  expect(candidateName.length).toBeGreaterThan(0)
  expect(candidateEmail.includes('+')).toBe(true)

  await search.fill(candidateName)
  await expect(select.locator('option:not([value=""])')).toHaveCount(1)
  await search.fill(invertCase(candidateName))
  await expect(select.locator('option:not([value=""])')).toHaveCount(1)

  await search.fill(candidateEmail)
  await expect(select.locator('option:not([value=""])')).toHaveCount(1)
  await expect(search).toHaveValue(candidateEmail)

  await search.fill(impossibleSearch)
  await expect(page.getByText('No se encontraron usuarios con ese criterio.', { exact: true })).toBeVisible()
  await expect(select.locator('option:not([value=""])')).toHaveCount(0)

  await search.fill('')
  await expect(select.locator('option:not([value=""])')).toHaveCount(allOptions.length)
  const selectedValue = await select.locator('option:not([value=""])').first().getAttribute('value')
  expect(selectedValue).toBeTruthy()
  await select.selectOption(selectedValue ?? '')
  await search.fill(impossibleSearch)
  await expect(select).toHaveValue(selectedValue ?? '')
  await expect(select.locator(`option[value="${selectedValue}"]`)).toHaveCount(1)

  assertNoWrites()
})

test('CHANGE-003 filtra jefes de grupo de forma independiente sin enviar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-teacher', 'Uses the authorized teacher state')
  const assertNoWrites = guardAgainstServerActionWrites(page)

  await page.goto('/solicitudes/grupal')
  await expect(page).toHaveURL(/\/solicitudes\/grupal$/)

  const firstSearch = page.getByRole('searchbox', { name: 'Buscar estudiante' }).first()
  const firstSelect = page.getByRole('combobox', { name: 'Jefe de grupo' }).first()
  await expect(firstSearch).toBeVisible()
  await expect(firstSelect).toBeVisible()

  const studentOptions = await firstSelect.locator('option:not([value=""])').allTextContents()
  expect(studentOptions.length, 'At least one active student must be available').toBeGreaterThan(0)
  const studentName = studentOptions[0].trim()
  expect(studentName.length).toBeGreaterThan(0)

  await firstSearch.fill(studentName)
  await expect(firstSelect.locator('option:not([value=""])')).toHaveCount(1)
  await firstSearch.fill(invertCase(studentName))
  await expect(firstSelect.locator('option:not([value=""])')).toHaveCount(1)

  await firstSearch.fill(impossibleSearch)
  await expect(page.getByText('No se encontraron estudiantes con ese criterio.', { exact: true })).toBeVisible()
  await expect(firstSelect.locator('option:not([value=""])')).toHaveCount(0)

  await firstSearch.fill('')
  await expect(firstSelect.locator('option:not([value=""])')).toHaveCount(studentOptions.length)
  const selectedValue = await firstSelect.locator('option:not([value=""])').first().getAttribute('value')
  expect(selectedValue).toBeTruthy()
  await firstSelect.selectOption(selectedValue ?? '')
  await firstSearch.fill(impossibleSearch)
  await expect(firstSelect).toHaveValue(selectedValue ?? '')
  await expect(firstSelect.locator(`option[value="${selectedValue}"]`)).toHaveCount(1)

  await page.getByRole('button', { name: '+ agregar grupo', exact: true }).click()
  const searches = page.getByRole('searchbox', { name: 'Buscar estudiante' })
  const selects = page.getByRole('combobox', { name: 'Jefe de grupo' })
  await expect(searches).toHaveCount(2)
  await expect(selects).toHaveCount(2)
  await searches.nth(0).fill(impossibleSearch)
  await expect(searches.nth(1)).toHaveValue('')
  await expect(selects.nth(1).locator('option:not([value=""])')).toHaveCount(studentOptions.length)

  assertNoWrites()
})
