import path from 'node:path'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'

type Role = 'admin' | 'lab-staff' | 'teacher' | 'student'

const statePath = (role: Role) => path.resolve('.e2e-state/playwright', `${role}.json`)

const routes: Record<Role, string[]> = {
  admin: ['/dashboard', '/dashboard/usuarios', '/dashboard/analitica', '/inventario'],
  'lab-staff': ['/dashboard', '/prestamos', '/devoluciones', '/mantenimiento'],
  teacher: ['/solicitudes', '/solicitudes/nueva', '/solicitudes/grupal'],
  student: ['/solicitudes', '/solicitudes/nueva', '/solicitudes/mis-solicitudes'],
}

function observe(page: Page, role: Role, violations: string[], pageErrors: string[]) {
  page.on('console', (message) => {
    const value = message.text()
    if (
      /content security policy/i.test(value) ||
      /violat(?:es|ion).*directive/i.test(value) ||
      /refused to (?:apply|connect|execute|load)/i.test(value)
    ) {
      violations.push(`${role}:CSP`)
    }
  })
  page.on('pageerror', (error) => pageErrors.push(`${role}:${error.name}`))
}

test('authenticated routes satisfy the enforced CSP without writes', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-auth-ephemeral', 'Runs once with existing role storage states')

  const baseURL = String(testInfo.project.use.baseURL)
  const contexts: BrowserContext[] = []
  const violations: string[] = []
  const pageErrors: string[] = []
  let serverActionWrites = 0
  let routeCount = 0

  try {
    for (const role of Object.keys(routes) as Role[]) {
      const context = await browser.newContext({ baseURL, storageState: statePath(role) })
      contexts.push(context)
      context.on('request', (request) => {
        if (request.method() === 'POST' && request.headers()['next-action']) serverActionWrites += 1
      })

      const page = await context.newPage()
      observe(page, role, violations, pageErrors)

      for (const route of routes[role]) {
        const response = await page.goto(route)
        expect(response?.ok(), `${role}:${route} must load`).toBeTruthy()
        expect(response?.headers()['content-security-policy-report-only'], `${role}:${route} must expose report-only CSP`).toBeTruthy()
        expect(response?.headers()['content-security-policy'], `${role}:${route} must enforce CSP`).toBeTruthy()
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        routeCount += 1
      }
    }

    expect(routeCount).toBe(14)
    expect(violations, 'No authenticated route may report a CSP violation').toEqual([])
    expect(pageErrors, 'No authenticated route may raise a runtime error').toEqual([])
    expect(serverActionWrites, 'No Server Action may be submitted').toBe(0)
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})
