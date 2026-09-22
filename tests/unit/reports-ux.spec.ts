import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

test.describe('Claridad visual de reportes y analítica', () => {
  test('diferencia analítica de bienes de exportaciones administrativas', () => {
    const shell = read('components/app-shell.tsx')
    const dashboard = read('app/dashboard/page.tsx')
    const analytics = read('app/dashboard/analitica/page.tsx')

    expect(shell).toContain(
      "{ href: '/dashboard/analitica', label: 'Analítica de bienes'"
    )
    expect(dashboard).toContain("label: 'Exportaciones'")
    expect(dashboard).toContain('Exportaciones administrativas')
    expect(analytics).toContain('Analítica de utilización de bienes')
  })

  test('mantiene intactas las rutas existentes', () => {
    const shell = read('components/app-shell.tsx')
    const dashboard = read('app/dashboard/page.tsx')

    expect(shell).toContain("href: '/dashboard/analitica'")
    expect(dashboard).toContain('action="/dashboard/export"')
    expect(dashboard).toContain('href="/dashboard/analitica"')
  })

  test('el ranking usa código, tooltip descriptivo, valor visible y altura dinámica', () => {
    const page = read('app/dashboard/analitica/page.tsx')
    const charts = read('app/dashboard/analitica/analytics-charts.tsx')

    expect(page).toContain(
      '{ code: row.code, name: row.name, value: row.totalQuantity }'
    )
    expect(charts).toContain("dataKey=\"code\"")
    expect(charts).toContain('Tooltip content={RankingTooltip}')
    expect(charts).toContain('LabelList dataKey="value" position="right"')
    expect(charts).toContain('topItems.length * 46 + 64')
    expect(charts).toContain('10 bienes con mayor uso')
    expect(charts).toContain('10 bienes con menor uso')
    expect(charts).toContain(
      'Cantidad basada en unidades entregadas durante el período seleccionado.'
    )
  })

  test('no introduce cambios de datos o seguridad en los archivos visuales', () => {
    const sources = [
      read('components/app-shell.tsx'),
      read('app/dashboard/page.tsx'),
      read('app/dashboard/analitica/page.tsx'),
      read('app/dashboard/analitica/analytics-charts.tsx'),
    ].join('\n')

    expect(sources).not.toMatch(/\.insert\(/)
    expect(sources).not.toMatch(/\.update\(/)
    expect(sources).not.toMatch(/\.delete\(/)
    expect(sources).not.toMatch(/\.rpc\([^)]*(create|update|delete|register)/i)
  })
})
