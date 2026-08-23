import path from 'node:path'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

type Evidence = { writes: number; pageErrors: string[]; hydrationErrors: string[]; routePasses: number }
const statePath = (role: string) => path.resolve('.e2e-state/playwright', `${role}.json`)

function observe(context: BrowserContext, evidence: Evidence) {
  context.on('request', (request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) evidence.writes += 1
  })
  context.on('page', (page) => {
    page.on('pageerror', (error) => evidence.pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' && /hydration|hydrated|server rendered html/i.test(message.text())) {
        evidence.hydrationErrors.push(message.text())
      }
    })
  })
}

async function smoke(page: Page, route: string, heading: string, evidence: Evidence) {
  await page.goto(route)
  await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?.*)?$`))
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
  evidence.routePasses += 1
}

async function assertNoGlobalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
}

test('CHANGE-005 completa contratos semánticos pendientes sin mutaciones', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-admin', 'Single completion-only read-only target')

  const baseURL = String(testInfo.project.use.baseURL)
  const evidence: Evidence = { writes: 0, pageErrors: [], hydrationErrors: [], routePasses: 0 }
  const teacherContext = await browser.newContext({ baseURL, storageState: statePath('teacher') })
  const studentContext = await browser.newContext({ baseURL, storageState: statePath('student') })
  const contexts = [teacherContext, studentContext]
  contexts.forEach((context) => observe(context, evidence))

  try {
    const teacherPage = await teacherContext.newPage()
    const teacherRoutes: Array<[string, string]> = [
      ['/solicitudes/catalogo', 'Catálogo disponible'],
      ['/solicitudes/mis-solicitudes', 'Mis solicitudes'],
      ['/solicitudes/mis-prestamos', 'Mis préstamos'],
    ]
    for (const [route, heading] of teacherRoutes) await smoke(teacherPage, route, heading, evidence)

    await teacherPage.goto('/solicitudes/grupal')
    const groupSearch = teacherPage.getByRole('searchbox', { name: 'Buscar estudiante' }).first()
    const groupLeader = teacherPage.getByRole('combobox', { name: 'Jefe de grupo' }).first()
    await expect(groupSearch).toBeVisible()
    await expect(groupLeader).toBeVisible()
    const selectedValue = await groupLeader.locator('option:not([value=""])').first().getAttribute('value')
    const selectedName = await groupLeader.locator('option:not([value=""])').first().textContent()
    if (selectedValue && selectedName) {
      await groupLeader.selectOption(selectedValue)
      await groupSearch.fill(selectedName.trim())
      await expect(groupLeader).toHaveValue(selectedValue)
      await expect(groupLeader.locator('option:not([value=""])')).toHaveCount(1)
    }
    await expect(teacherPage.getByRole('button', { name: 'Enviar solicitud con grupos' })).toBeVisible()
    await teacherPage.setViewportSize({ width: 390, height: 844 })
    await assertNoGlobalOverflow(teacherPage)
    await expect(groupSearch).toBeVisible()
    await expect(groupLeader).toBeVisible()

    const studentPage = await studentContext.newPage()
    const studentRoutes: Array<[string, string]> = [
      ['/solicitudes', 'Portal de laboratorio'],
      ['/solicitudes/nueva', 'Nueva solicitud individual'],
      ['/solicitudes/catalogo', 'Catálogo disponible'],
      ['/solicitudes/mis-solicitudes', 'Mis solicitudes'],
      ['/solicitudes/mis-prestamos', 'Mis préstamos'],
    ]
    for (const [route, heading] of studentRoutes) await smoke(studentPage, route, heading, evidence)
    await studentPage.goto('/solicitudes/grupal')
    await expect(studentPage).toHaveURL(/\/solicitudes$/)

    expect(evidence.routePasses).toBe(8)
    expect(evidence.writes, 'No Server Action may be submitted').toBe(0)
    expect(evidence.pageErrors, 'No unexpected browser errors in the completion slice').toEqual([])
    expect(evidence.hydrationErrors, 'No hydration errors in the completion slice').toEqual([])
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})
