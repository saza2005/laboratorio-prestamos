import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import ExcelJS from 'exceljs'
import path from 'node:path'
import { loadIndependentExpected } from './change-004-analytics-expected'

const state = (role: string) => path.resolve('.e2e-state/playwright', `${role}.json`)
type Role = 'admin' | 'lab-staff' | 'teacher' | 'student'

test('CHANGE-004 valida analítica y Excel sin mutaciones', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-admin', 'Single targeted execution uses isolated role contexts')
  test.setTimeout(120_000)
  const contexts: BrowserContext[] = []
  let serverActionPosts = 0
  const open = async (role: Role) => {
    const context = await browser.newContext({
      storageState: state(role),
      baseURL: testInfo.project.use.baseURL,
    })
    contexts.push(context)
    const page = await context.newPage()
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.headers()['next-action']) serverActionPosts += 1
    })
    return { context, page }
  }

  try {
    const expected = await loadIndependentExpected()
    expect(expected.rows.length, 'E2E inventory must not be empty').toBeGreaterThan(0)
    const totalQuantity = expected.rows.reduce((sum, row) => sum + row.quantity, 0)
    const mostUsed = expected.rows[0]

    for (const role of ['teacher', 'student'] as const) {
      const { context, page } = await open(role)
      await page.goto('/dashboard/analitica')
      await expect(page).toHaveURL(/\/solicitudes$/)
      const exportResponse = await context.request.get('/dashboard/analitica/export')
      expect(exportResponse.status()).toBe(403)
    }

    for (const role of ['admin', 'lab-staff'] as const) {
      const { context, page } = await open(role)
      await page.goto('/dashboard')
      const reportsTab = page.getByRole('tab', { name: 'Reportes', exact: true })
      await reportsTab.click()
      await expect(reportsTab).toHaveAttribute('aria-selected', 'true')
      const reportsPanel = page.getByRole('tabpanel', { name: 'Reportes' })
      const analyticsLink = reportsPanel.getByRole('link', { name: 'Analítica de uso de bienes' })
      await expect(analyticsLink).toBeVisible()
      await analyticsLink.click()
      await expect(page).toHaveURL(/\/dashboard\/analitica$/)
      await expect(page.getByRole('heading', { name: 'Analítica de uso de bienes' })).toBeVisible()
      const exportResponse = await context.request.get('/dashboard/analitica/export')
      expect(exportResponse.status()).toBe(200)
      expect(exportResponse.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    }

    const { context: adminContext, page } = await open('admin')
    await page.goto('/dashboard/analitica')
    await expectMetricCard(page, 'Unidades prestadas', totalQuantity)
    const table = page.getByRole('table')
    const mostUsedRow = table.getByRole('row').filter({ hasText: mostUsed.code })
    await expect(mostUsedRow).toHaveCount(1)
    const cells = mostUsedRow.getByRole('cell')
    await expect(cells.nth(3)).toHaveText(String(mostUsed.uniqueLoans))
    await expect(cells.nth(4)).toHaveText(String(mostUsed.quantity))
    await expect(cells.nth(8)).toHaveText(String(mostUsed.usage30))
    await expect(cells.nth(9)).toHaveText(String(mostUsed.usage90))
    await expect(cells.nth(10)).toHaveText(String(mostUsed.usage365))
    if (mostUsed.lastUsage) await expect(cells.nth(6)).not.toHaveText('Nunca')

    const neverUsed = expected.rows.find((row) => row.quantity === 0)
    if (neverUsed) {
      const row = table.getByRole('row').filter({ hasText: neverUsed.code })
      await expect(row).toContainText('SIN USO REGISTRADO')
      console.log('CHANGE_004_METRIC_NEVER_USED=PASS')
    } else {
      console.log('CHANGE_004_METRIC_NEVER_USED=NOT_APPLICABLE_REMOTE_STATE')
    }

    for (const period of ['30', '90', '365', 'all'] as const) {
      await page.goto(`/dashboard/analitica?period=${period}`)
      await expect(page.getByLabel('Periodo')).toHaveValue(period)
      const days = period === 'all' ? null : Number(period)
      const expectedTotal = expected.rows.reduce((sum, row) => sum + (
        days === 30 ? row.usage30 : days === 90 ? row.usage90 : days === 365 ? row.usage365 : row.quantity
      ), 0)
      await expectMetricCard(page, 'Unidades prestadas', expectedTotal)
    }

    await page.goto('/dashboard/analitica')
    await page.getByLabel('Buscar').fill(mostUsed.code)
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(mostUsed.code)}`))
    await expect(table.getByRole('row').filter({ hasText: mostUsed.code })).toHaveCount(1)

    if (mostUsed.category) {
      await page.goto('/dashboard/analitica')
      await page.getByLabel('Categoría').selectOption({ label: mostUsed.category })
      await page.getByRole('button', { name: 'Aplicar filtros' }).click()
      await expect(page.getByLabel('Categoría')).toHaveValue(mostUsed.category)
      const expectedCount = expected.rows.filter((row) => row.category === mostUsed.category).length
      await expectMetricCard(page, 'Bienes visibles', expectedCount)
    }

    await page.goto('/dashboard/analitica')
    await page.getByLabel('Estado').selectOption({ label: 'Activo' })
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expectMetricCard(page, 'Bienes visibles', expected.rows.filter((row) => row.status === 'active').length)

    await page.goto('/dashboard/analitica')
    await page.getByLabel('Solo bienes sin uso registrado').check()
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expectMetricCard(page, 'Bienes visibles', expected.rows.filter((row) => row.quantity === 0).length)

    for (const ranking of ['most', 'least'] as const) {
      await page.goto(`/dashboard/analitica?ranking=${ranking}`)
      await expect(page.getByLabel('Ranking')).toHaveValue(ranking)
      const firstExpected = [...expected.rows].sort((a, b) => ranking === 'most'
        ? b.quantity - a.quantity || a.name.localeCompare(b.name, 'es')
        : a.quantity - b.quantity || a.name.localeCompare(b.name, 'es'))[0]
      await expect(table.getByRole('row').nth(1)).toContainText(firstExpected.code)
    }

    await page.goto('/dashboard/analitica')
    for (const title of ['Top 10 por cantidad prestada', 'Evolución mensual', 'Distribución de señales administrativas']) {
      const panel = page.getByRole('heading', { name: title }).locator('..')
      await expect(panel.locator('svg, div').first()).toBeVisible()
    }
    const visibleSurface = await page.locator('main').innerText()
    for (const profile of expected.profiles) {
      if (profile.email) expect(visibleSurface.includes(profile.email)).toBe(false)
      if (profile.full_name) expect(visibleSurface.includes(profile.full_name)).toBe(false)
      expect(visibleSurface.includes(profile.id)).toBe(false)
    }
    expect(visibleSurface.toLowerCase()).not.toContain('debe renovarse')
    expect(visibleSurface.toLowerCase()).not.toContain('debe comprarse')
    expect(visibleSurface.toLowerCase()).not.toContain('debe reemplazarse')

    const exportResponse = await adminContext.request.get(`/dashboard/analitica/export?q=${encodeURIComponent(mostUsed.code)}`)
    expect(exportResponse.status()).toBe(200)
    const body = await exportResponse.body()
    expect(body.byteLength).toBeGreaterThan(0)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(body as unknown as ExcelJS.Buffer)
    const main = workbook.getWorksheet('Uso de bienes')
    const methodology = workbook.getWorksheet('Metodología')
    expect(main).toBeTruthy()
    expect(methodology).toBeTruthy()
    const headers = main?.getRow(1).values as unknown[]
    for (const header of ['Código', 'Bien', 'Préstamos en periodo', 'Cantidad prestada en periodo', 'Usuarios distintos', 'Último uso', 'Uso 30 días', 'Uso 90 días', 'Uso 365 días', 'Indicador administrativo']) {
      expect(headers).toContain(header)
    }
    expect(main?.rowCount).toBe(2)
    expect(main?.getCell('A2').value).toBe(mostUsed.code)
    const workbookText = workbook.worksheets.flatMap((sheet) => sheet.getSheetValues()).flat(3).join(' ')
    for (const profile of expected.profiles) {
      if (profile.email) expect(workbookText.includes(profile.email)).toBe(false)
      if (profile.full_name) expect(workbookText.includes(profile.full_name)).toBe(false)
      expect(workbookText.includes(profile.id)).toBe(false)
    }
    const demandColumn = headers.findIndex((value) => value === 'Demanda 90d / stock')
    expect(demandColumn).toBeGreaterThan(0)
    expect(main?.getRow(2).getCell(demandColumn).value).toBe(mostUsed.demandStock90 ?? '-')

    expect(serverActionPosts).toBe(0)
    console.log('CHANGE_004_READ_ONLY_RESULT=PASS')
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})

async function expectMetricCard(page: Page, label: string, value: number) {
  const card = page.getByText(label, { exact: true }).locator('..')
  await expect(card.getByText(String(value), { exact: true })).toBeVisible()
}
