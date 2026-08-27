import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

type Role = 'admin' | 'lab-staff' | 'teacher' | 'student'

const statePath = (role: Role) => path.resolve('.e2e-state/playwright', `${role}.json`)

const routes: Record<Role, string[]> = {
  admin: ['/dashboard', '/dashboard/usuarios', '/dashboard/analitica', '/inventario'],
  'lab-staff': ['/dashboard', '/prestamos', '/devoluciones', '/mantenimiento'],
  teacher: ['/solicitudes', '/solicitudes/nueva', '/solicitudes/grupal'],
  student: ['/solicitudes', '/solicitudes/nueva', '/solicitudes/mis-solicitudes'],
}

async function auditAccessibility(page: Page, role: Role, route: string, failures: string[]) {
  await page.goto(route)
  await expect(page).not.toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const violationIds = results.violations.map((violation) => violation.id)
  if (violationIds.length > 0) failures.push(`${role}:${route}:${violationIds.join(',')}`)
}

test('authenticated routes meet the semantic accessibility baseline without writes', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-auth-ephemeral', 'Runs once with existing role storage states')

  const baseURL = String(testInfo.project.use.baseURL)
  const contexts: BrowserContext[] = []
  let serverActionWrites = 0
  const pageErrors: string[] = []
  const hydrationErrors: string[] = []
  const accessibilityFailures: string[] = []

  try {
    for (const role of Object.keys(routes) as Role[]) {
      const context = await browser.newContext({ baseURL, storageState: statePath(role) })
      contexts.push(context)
      context.on('request', (request) => {
        if (request.method() === 'POST' && request.headers()['next-action']) serverActionWrites += 1
      })

      const page = await context.newPage()
      page.on('pageerror', (error) => pageErrors.push(error.name))
      page.on('console', (message) => {
        if (message.type() === 'error' && /hydration|hydrated|server rendered html/i.test(message.text())) {
          hydrationErrors.push('hydration')
        }
      })

      for (const route of routes[role]) await auditAccessibility(page, role, route, accessibilityFailures)
    }

    expect(accessibilityFailures, 'Authenticated routes must have no WCAG A/AA violations').toEqual([])
    expect(serverActionWrites, 'No Server Action may be submitted').toBe(0)
    expect(pageErrors, 'No unexpected runtime errors').toEqual([])
    expect(hydrationErrors, 'No hydration errors').toEqual([])
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})
