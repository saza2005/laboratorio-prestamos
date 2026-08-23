import { expect, test } from '@playwright/test'
import ExcelJS from 'exceljs'
import { loadIndependentExpected } from './change-004-analytics-expected'

test('CHANGE-004 completa gráficos, privacidad, demanda y Excel sin mutaciones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-admin', 'Completion uses one existing admin context')
  test.setTimeout(60_000)
  let serverActionPosts = 0
  let exportRequests = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) serverActionPosts += 1
    if (request.method() === 'GET' && request.url().includes('/dashboard/analitica/export')) exportRequests += 1
  })

  const expected = await loadIndependentExpected()
  const demandItem = expected.rows.find((row) => row.stock_total > 0)

  await page.goto('/dashboard/analitica')
  await expect(page).toHaveURL(/\/dashboard\/analitica$/)
  await expect(page.getByRole('heading', { name: 'Analítica de uso de bienes' })).toBeVisible()

  for (const title of [
    'Top 10 por cantidad prestada',
    'Evolución mensual',
    'Distribución de señales administrativas',
  ]) {
    const heading = page.getByRole('heading', { name: title, exact: true })
    await expect(heading).toBeVisible()
    const panel = page.locator('section').filter({ has: heading })
    await expect(panel).toHaveCount(1)
    const chartRendered = await panel.locator('svg.recharts-surface').count() > 0
    const emptyRendered = await panel.getByText('Sin datos para los filtros seleccionados.', { exact: true }).count() > 0
    expect(chartRendered || emptyRendered, `Chart or its valid empty state must render: ${title}`).toBe(true)
  }

  const visibleSurface = await page.locator('main').innerText()
  for (const profile of expected.profiles) {
    if (profile.email) expect(visibleSurface.includes(profile.email)).toBe(false)
    if (profile.full_name) expect(visibleSurface.includes(profile.full_name)).toBe(false)
    expect(visibleSurface.includes(profile.id)).toBe(false)
  }

  if (!demandItem) {
    console.log('CHANGE_004_METRIC_DEMAND_STOCK=NOT_APPLICABLE_REMOTE_STATE')
  } else {
    const response = await page.request.get(
      `/dashboard/analitica/export?q=${encodeURIComponent(demandItem.code)}`
    )
    expect(response.status()).toBe(200)
    const body = await response.body()
    expect(body.byteLength).toBeGreaterThan(0)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(body as unknown as ExcelJS.Buffer)
    const main = workbook.getWorksheet('Uso de bienes')
    const methodology = workbook.getWorksheet('Metodología')
    expect(main).toBeTruthy()
    expect(methodology).toBeTruthy()

    const headers = main?.getRow(1).values as unknown[]
    for (const header of [
      'Código',
      'Bien',
      'Stock total',
      'Préstamos en periodo',
      'Cantidad prestada en periodo',
      'Usuarios distintos',
      'Último uso',
      'Uso 30 días',
      'Uso 90 días',
      'Uso 365 días',
      'Demanda 90d / stock',
      'Indicador administrativo',
    ]) {
      expect(headers).toContain(header)
    }
    expect(main?.rowCount).toBe(2)
    expect(main?.getCell('A2').value).toBe(demandItem.code)
    const demandColumn = headers.findIndex((value) => value === 'Demanda 90d / stock')
    expect(demandColumn).toBeGreaterThan(0)
    expect(main?.getRow(2).getCell(demandColumn).value).toBe(demandItem.demandStock90 ?? '-')

    const workbookText = workbook.worksheets
      .flatMap((sheet) => sheet.getSheetValues()).flat(3).join(' ')
    for (const profile of expected.profiles) {
      if (profile.email) expect(workbookText.includes(profile.email)).toBe(false)
      if (profile.full_name) expect(workbookText.includes(profile.full_name)).toBe(false)
      expect(workbookText.includes(profile.id)).toBe(false)
    }
    console.log('CHANGE_004_METRIC_DEMAND_STOCK=PASS')
  }

  expect(serverActionPosts).toBe(0)
  expect(exportRequests).toBe(demandItem ? 1 : 0)
  console.log(`CHANGE_004_EXCEL_EXPORT_REQUEST_COUNT=${exportRequests}`)
  console.log('CHANGE_004_COMPLETION_RESULT=PASS')
})
