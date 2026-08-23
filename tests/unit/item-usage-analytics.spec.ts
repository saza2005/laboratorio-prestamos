import { expect, test } from '@playwright/test'
import {
  buildItemUsageAnalytics,
  filterItemUsageRows,
  type AnalyticsInventoryItem,
  type AnalyticsUsageEvent,
} from '@/lib/item-usage-analytics'

const now = new Date('2026-08-23T12:00:00.000Z')
const items: AnalyticsInventoryItem[] = [
  { id: 'item-used', code: 'EQ-01', name: 'Microscopio', category: 'Óptica', itemType: 'equipment', stockTotal: 3, stockAvailable: 2, status: 'active', location: 'Lab A' },
  { id: 'item-old', code: 'EQ-02', name: 'Balanza', category: 'Medición', itemType: 'equipment', stockTotal: 2, stockAvailable: 2, status: 'active', location: 'Lab B' },
  { id: 'item-never', code: 'EQ-03', name: 'Osciloscopio', category: 'Electrónica', itemType: 'equipment', stockTotal: 1, stockAvailable: 1, status: 'inactive', location: null },
]
const events: AnalyticsUsageEvent[] = [
  { loanId: 'loan-1', itemId: 'item-used', userId: 'user-1', quantity: 2, usedAt: '2026-08-18T10:00:00.000Z' },
  { loanId: 'loan-2', itemId: 'item-used', userId: 'user-2', quantity: 1, usedAt: '2026-07-04T10:00:00.000Z' },
  { loanId: 'loan-3', itemId: 'item-used', userId: 'user-1', quantity: 4, usedAt: '2026-04-15T10:00:00.000Z' },
  { loanId: 'loan-4', itemId: 'item-used', userId: 'user-3', quantity: 1, usedAt: '2025-07-01T10:00:00.000Z' },
  { loanId: 'loan-old', itemId: 'item-old', userId: 'user-4', quantity: 1, usedAt: '2024-01-01T12:00:00.000Z' },
]

test('agrega cantidades, préstamos, usuarios y ventanas sin contar devoluciones', () => {
  const result = buildItemUsageAnalytics(items, events, { now, period: 'all' })
  const used = result.rows.find((row) => row.id === 'item-used')
  expect(used).toMatchObject({
    loanCount: 4,
    totalQuantity: 8,
    historicalQuantity: 8,
    distinctUsers: 3,
    usage30: 2,
    usage90: 3,
    usage365: 7,
  })
  // El agregador recibe únicamente eventos de entrega; no acepta ni suma return_items.
  expect(used?.totalQuantity).toBe(2 + 1 + 4 + 1)
})

test('calcula último uso y días transcurridos de forma determinista', () => {
  const used = buildItemUsageAnalytics(items, events, { now, period: 'all' }).rows
    .find((row) => row.id === 'item-used')
  expect(used?.lastUsedAt).toBe('2026-08-18T10:00:00.000Z')
  expect(used?.daysSinceLastUse).toBe(5)
})

test('incluye bienes nunca usados y asigna señales administrativas prudentes', () => {
  const rows = buildItemUsageAnalytics(items, events, { now, period: 'all' }).rows
  expect(rows.find((row) => row.id === 'item-never')).toMatchObject({
    loanCount: 0,
    totalQuantity: 0,
    lastUsedAt: null,
    daysSinceLastUse: null,
    indicator: 'SIN USO REGISTRADO',
  })
  expect(rows.find((row) => row.id === 'item-old')?.indicator).toBe('BAJA ROTACIÓN')
  expect(rows.find((row) => row.id === 'item-used')?.indicator).toBe('USO RECIENTE')
})

test('aplica el periodo al ranking y conserva las ventanas comparativas', () => {
  const rows = buildItemUsageAnalytics(items, events, { now, period: '30' }).rows
  expect(rows[0].id).toBe('item-used')
  expect(rows[0]).toMatchObject({ loanCount: 1, totalQuantity: 2, usage90: 3, usage365: 7 })
  expect(rows.at(-1)?.totalQuantity).toBe(0)
})

test('ordena rankings y filtra texto, categoría, estado y bienes sin uso', () => {
  const rows = buildItemUsageAnalytics(items, events, { now, period: 'all' }).rows
  expect(filterItemUsageRows(rows, { ranking: 'most' }).map((row) => row.id))
    .toEqual(['item-used', 'item-old', 'item-never'])
  expect(filterItemUsageRows(rows, { ranking: 'least' })[0].id).toBe('item-never')
  expect(filterItemUsageRows(rows, { search: 'OSCILO', onlyUnused: true })[0].id).toBe('item-never')
  expect(filterItemUsageRows(rows, { category: 'Óptica', status: 'active' })).toHaveLength(1)
})
