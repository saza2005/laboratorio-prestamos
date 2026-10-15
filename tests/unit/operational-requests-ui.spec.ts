import { execFile } from 'node:child_process'
import type { ComponentProps } from 'react'
import { expect, test } from '@playwright/test'
import type { RequestsTable } from '@/app/dashboard/solicitudes/requests-table'

type Props = ComponentProps<typeof RequestsTable>
const request: Props['requests'][number] = {
  id: 'fixture', status: 'pending', requested_at: '2026-10-15T12:00:00Z',
  purpose: 'Práctica de instrumentación', comments: null, scheduled_return_date: null,
  rejection_reason: null, requester: { full_name: 'Persona de prueba' },
  loan: null, loans: [], request_items: [], request_groups: [], actions: null,
}
// Playwright's JSX transform targets component fixtures. Render the actual React
// component in an isolated Node process using TypeScript's React JSX transform.
const renderScript = `
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(id, ...args) {
  return resolve.call(this, id.startsWith('@/') ? path.join(process.cwd(), id.slice(2)) : id, ...args);
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    }}).outputText, filename);
}
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime');
const { RequestsTable } = require('./app/dashboard/solicitudes/requests-table.tsx');
const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: 'fixture' };
const props = JSON.parse(fs.readFileSync(0, 'utf8'));
const element = createElement(AppRouterContext.Provider, { value: router }, createElement(RequestsTable, props));
fs.writeSync(1, renderToStaticMarkup(element));
process.exit(0);
`
function render(overrides: Partial<Props> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, ['-e', renderScript], {
      encoding: 'utf8', timeout: 10000, env: { PATH: process.env.PATH, NODE_ENV: 'test' },
    }, (error, stdout) => error ? reject(error) : resolve(stdout))
    child.stdin?.end(JSON.stringify({
      requests: [request], statusFilter: 'pending', initialSearch: '', page: 1,
      total: 1, historicalCount: 0, operational: true, ...overrides,
    }))
  })
}

test('muestra pendientes y contadores sin anunciar las últimas 100', async () => {
  const html = await render()
  expect(html).toContain('Persona de prueba')
  expect(html).toContain('Pendientes: 1–1 de 1 solicitudes.')
  expect(html).not.toContain('últimas 100')
})

test('búsqueda sin tildes conserva alcance local y navegación a otras páginas', async () => {
  const html = await render({ initialSearch: 'instrumentacion', total: 60, page: 2 })
  expect(html).toContain('Persona de prueba')
  expect(html).toContain('26–50 de 60')
  expect(html).toContain('status=pending&amp;q=instrumentacion')
  expect(html).toContain('page=3&amp;q=instrumentacion')
  expect(html).toContain('La búsqueda examina únicamente los registros cargados')
  const empty = await render({ initialSearch: 'no coincide', total: 60 })
  expect(empty).toContain('No hay coincidencias en los registros cargados')
  expect(empty).toContain('Siguiente')
})

test('todos los estados muestra cola y alcance histórico por separado', async () => {
  const html = await render({ statusFilter: '', historicalCount: 100, total: 30 })
  expect(html).toContain('Cola operativa (pendientes y aprobadas)')
  expect(html).toContain('Historial: 100 registros cargados')
  expect(html).toContain('sin pendientes ni aprobadas')
  expect(html).toContain('Persona de prueba')
})

test('estado vacío de pendientes se distingue de búsqueda sin coincidencias', async () => {
  expect(await render({ requests: [], total: 0 })).toContain('No hay solicitudes en este estado.')
  expect(await render({ requests: [], total: 0, initialSearch: 'texto' })).toContain('La búsqueda no incluye otras páginas.')
})

test('historial conserva búsqueda local y filtros de préstamo y entrega parcial', async () => {
  const returned = { ...request, status: 'delivered', loan: { status: 'returned' } }
  expect(await render({ requests: [returned], statusFilter: 'returned', operational: false, historicalCount: 1 })).toContain('Persona de prueba')
  const partial = { ...request, status: 'delivered', request_items: [{ id: 'item', quantity_requested: 2, quantity_approved: 2, quantity_delivered: 1, item: null }] }
  const html = await render({ requests: [partial], statusFilter: 'partial_delivery', operational: false, historicalCount: 1 })
  expect(html).toContain('Persona de prueba')
  expect(html).toContain('Entregada parcialmente')
})
