import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { loadRequests, parseRequestFilters, requestsHref } from '@/app/dashboard/solicitudes/requests-query'
import { getVisibleRequestStatus } from '@/lib/request-delivery-status'
import { canManageLoans } from '@/lib/supabase/auth/roles'

function row(index: number, status = 'delivered', requested_at = '2026-10-15T12:00:00Z') {
  return {
    id: String(index).padStart(5, '0'), status, requested_at,
    purpose: `Solicitud ${index}`, comments: null, scheduled_return_date: null, rejection_reason: null,
    requester: { full_name: `Persona ${index}`, email: 'fixture@example.invalid' },
    loans: [], request_items: [], request_groups: [],
  }
}
type Row = ReturnType<typeof row>

// Exercise the real Supabase SDK/query builder against an in-memory HTTP endpoint.
// No credentials, real accounts or database connections are used.
function database(rows: Row[], failOn?: 'HEAD' | 'GET') {
  const calls: { url: URL; method: string }[] = []
  const client = createClient('https://fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input))
      const method = init?.method ?? 'GET'
      calls.push({ url, method })
      if (method === failOn) return new Response(JSON.stringify({ message: 'Consulta denegada', code: '42501' }), { status: 403 })
      const status = url.searchParams.get('status')
      let matches = rows.filter((entry) => {
        if (status?.startsWith('eq.')) return entry.status === status.slice(3)
        if (status === 'in.(pending,approved)') return ['pending', 'approved'].includes(entry.status)
        if (status === 'not.in.(pending,approved)') return !['pending', 'approved'].includes(entry.status)
        return true
      })
      const count = matches.length
      if (url.searchParams.get('order') === 'requested_at.asc,id.asc') {
        matches = [...matches].sort((a, b) => a.requested_at.localeCompare(b.requested_at) || a.id.localeCompare(b.id))
      }
      const start = Number(url.searchParams.get('offset') ?? 0)
      const size = Number(url.searchParams.get('limit') ?? matches.length)
      matches = matches.slice(start, start + size)
      return new Response(method === 'HEAD' ? null : JSON.stringify(matches), {
        status: 200, headers: { 'content-type': 'application/json', 'content-range': `*/${count}` },
      })
    } },
  })
  return { client, calls }
}

const closed = Array.from({ length: 100 }, (_, i) => row(i, i < 60 ? 'delivered' : i < 80 ? 'rejected' : 'cancelled', '2026-06-01T12:00:00Z'))

test('A: cuatro pendientes recientes se filtran antes del límite de recuperación', async () => {
  const pending = Array.from({ length: 4 }, (_, i) => row(100 + i, 'pending'))
  const { client, calls } = database([...closed, ...pending])
  const result = await loadRequests(client, 'pending', 1)
  expect(result.rows.map((entry) => entry.id)).toEqual(pending.map((entry) => entry.id))
  expect(result.total).toBe(4)
  expect(calls.every(({ url }) => url.searchParams.get('status') === 'eq.pending')).toBe(true)
})

test('B: aprobadas recientes y pendientes antiguas no dependen del historial', async () => {
  const old = row(999, 'pending', '2020-01-01T00:00:00Z')
  const { client } = database([...closed, ...closed.map((entry) => ({ ...entry, id: `extra-${entry.id}` })), old, row(1000, 'approved')])
  expect((await loadRequests(client, 'approved', 1)).rows.map((entry) => entry.id)).toEqual(['01000'])
  expect((await loadRequests(client, 'pending', 1)).rows.map((entry) => entry.id)).toEqual([old.id])
})

for (const status of ['pending', 'approved'] as const) {
  test(`C: todas las ${status} son accesibles por páginas con fechas iguales`, async () => {
    const active = Array.from({ length: 63 }, (_, i) => row(100 + i, status))
    const { client, calls } = database([...closed, ...active].reverse())
    const pages = await Promise.all([1, 2, 3].map((page) => loadRequests(client, status, page)))
    expect(pages.map((page) => page.rows.length)).toEqual([25, 25, 13])
    const ids = pages.flatMap((page) => page.rows.map((entry) => entry.id))
    expect(ids).toEqual(active.map((entry) => entry.id))
    expect(new Set(ids).size).toBe(63)
    expect(calls.filter((call) => call.method === 'GET').every(({ url }) => url.searchParams.get('order') === 'requested_at.asc,id.asc')).toBe(true)
  })
}

test('D: todos los estados permite recorrer la cola completa sin duplicar historial', async () => {
  const active = Array.from({ length: 31 }, (_, i) => row(100 + i, i % 2 ? 'approved' : 'pending'))
  const { client } = database([...closed, ...active])
  const first = await loadRequests(client, '', 1)
  const second = await loadRequests(client, '', 2)
  expect(first.rows).toHaveLength(125)
  expect(second.rows).toHaveLength(106)
  for (const result of [first, second]) {
    expect(new Set(result.rows.map((entry) => entry.id)).size).toBe(result.rows.length)
    expect(result.historicalCount).toBe(100)
    expect(result.total).toBe(31)
  }
  expect([...first.rows, ...second.rows].filter((entry) => ['pending', 'approved'].includes(entry.status))).toHaveLength(31)
})

test('E: filtros y búsqueda se conservan; cambiar estado reinicia página y se ajustan índices fuera de rango', async () => {
  expect(requestsHref('approved', 1, 'instrumentación & control')).toContain('status=approved&q=')
  expect(requestsHref('approved', 1, 'texto')).not.toContain('page=')
  const href = requestsHref('pending', 3, 'instrumentación & control')
  const params = Object.fromEntries(new URL(href, 'https://fixture.invalid').searchParams)
  expect(parseRequestFilters(params)).toEqual({ status: 'pending', page: 3, search: 'instrumentación & control' })
  const { client } = database([row(1, 'pending')])
  expect((await loadRequests(client, 'pending', 90)).page).toBe(1)
  for (const page of ['-1', '1.2', 'Infinity', '9007199254740992', ['2']]) {
    expect(parseRequestFilters({ status: 'invalid', page }).page).toBe(1)
    expect(parseRequestFilters({ status: 'invalid', page }).status).toBe('')
  }
})

test('F: historial conserva filtros locales y entrega parcial individual y grupal', async () => {
  const { client, calls } = database(closed)
  const result = await loadRequests(client, 'partial_delivery', 1)
  expect(result.rows).toHaveLength(100)
  expect(calls).toHaveLength(1)
  expect(calls[0].url.searchParams.has('status')).toBe(false)
  expect(getVisibleRequestStatus({ status: 'delivered', request_items: [{ quantity_approved: 3, quantity_delivered: 1 }] })).toBe('partial_delivery')
  expect(getVisibleRequestStatus({ status: 'delivered', request_groups: [{ request_group_items: [{ item_id: 'item', quantity: 4 }] }], loans: [{ loan_items: [{ item_id: 'item', quantity: 2 }] }] })).toBe('partial_delivery')
  expect(getVisibleRequestStatus({ status: 'pending' })).toBe('pending')
})

test('G: roles no operativos continúan bloqueados antes de recuperar solicitudes', () => {
  for (const role of ['student', 'teacher', null, undefined]) expect(canManageLoans(role)).toBe(false)
  const page = readFileSync('app/dashboard/solicitudes/page.tsx', 'utf8')
  expect(page.indexOf('if (!canManageLoans(profile.role))')).toBeLessThan(page.indexOf('await loadRequests('))
  expect(page).toContain('await getAuthProfile()')
})

test('H: cero pendientes devuelve un conjunto vacío y página válida', async () => {
  const { client } = database(closed)
  const result = await loadRequests(client, 'pending', 50)
  expect(result.rows).toEqual([])
  expect(result.total).toBe(0)
  expect(result.page).toBe(1)
})

for (const method of ['HEAD', 'GET'] as const) {
  test(`I: errores ${method} de Supabase se propagan, no se convierten en listas vacías`, async () => {
    const { client } = database([row(1, 'pending')], method)
    await expect(loadRequests(client, 'pending', 1)).rejects.toThrow('Consulta denegada')
  })
}

// Model independently committed snapshots for the two list reads and the
// reconciliation read. All requests still pass through the real SDK builder.
function concurrentDatabase(active: unknown[], history: unknown[], refreshed: unknown[], failRefresh = false) {
  const calls: { url: URL; method: string }[] = []
  const client = createClient('https://fixture.invalid', 'fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input))
      const method = init?.method ?? 'GET'
      calls.push({ url, method })
      const reconciliation = url.searchParams.has('id')
      if (reconciliation && failRefresh) {
        return new Response(JSON.stringify({ message: 'Relectura denegada', code: '42501' }), { status: 403 })
      }
      const data = reconciliation ? refreshed
        : url.searchParams.get('status')?.startsWith('not.') ? history : active
      return new Response(method === 'HEAD' ? null : JSON.stringify(data), {
        status: 200, headers: { 'content-type': 'application/json', 'content-range': `*/${active.length}` },
      })
    } },
  })
  return { client, calls, refreshCalls: () => calls.filter(({ url }) => url.searchParams.has('id')) }
}

for (const [before, after] of [['approved', 'delivered'], ['pending', 'cancelled']] as const) {
  test(`reconciliación: ${before} a ${after} usa exclusivamente la relectura`, async () => {
    const current = { ...row(1, after), comments: 'Versión actualizada', purpose: 'Propósito actualizado' }
    const { client, refreshCalls } = concurrentDatabase([row(1, before)], [row(1, after)], [current])
    const result = await loadRequests(client, '', 1)
    expect(result.rows).toEqual([current])
    expect(result.historicalCount).toBe(1)
    expect(refreshCalls()).toHaveLength(1)
    expect(refreshCalls()[0].url.searchParams.get('id')).toBe('in.(00001)')
    expect(refreshCalls()[0].url.searchParams.get('limit')).toBe('1')
    expect(refreshCalls()[0].url.searchParams.has('status')).toBe(false)
  })
}

test('reconciliación: múltiples conflictos se agrupan y preservan filas ajenas al conflicto', async () => {
  const current = [row(1, 'delivered'), row(2, 'cancelled')]
  const unchangedActive = row(3, 'pending')
  const unchangedHistory = row(4, 'returned')
  const { client, calls, refreshCalls } = concurrentDatabase(
    [row(1, 'approved'), row(2, 'pending'), unchangedActive],
    [row(1, 'delivered'), row(2, 'cancelled'), unchangedHistory], current,
  )
  const result = await loadRequests(client, '', 1)
  expect(result.rows).toEqual([...current, unchangedActive, unchangedHistory])
  expect(new Set(result.rows.map((entry) => entry.id)).size).toBe(4)
  expect(result.historicalCount).toBe(3)
  expect(calls).toHaveLength(4) // count + operational + historical + one grouped reread
  expect(refreshCalls()).toHaveLength(1)
  expect(refreshCalls()[0].url.searchParams.get('id')).toBe('in.(00001,00002)')
  expect(refreshCalls()[0].url.searchParams.get('limit')).toBe('2')
  const select = calls.find(({ method }) => method === 'GET')!.url.searchParams.get('select')
  expect(refreshCalls()[0].url.searchParams.get('select')).toBe(select)
})

test('reconciliación: sin duplicados no agrega consultas', async () => {
  const { client, calls, refreshCalls } = concurrentDatabase([row(1, 'pending')], [row(2)], [])
  expect((await loadRequests(client, '', 1)).rows).toHaveLength(2)
  expect(calls).toHaveLength(3)
  expect(refreshCalls()).toHaveLength(0)
})

test('reconciliación: omite conflictos que ya no son visibles sin perder otras filas', async () => {
  const retained = row(2, 'pending')
  const { client } = concurrentDatabase([row(1, 'approved'), retained], [row(1)], [])
  const result = await loadRequests(client, '', 1)
  expect(result.rows).toEqual([retained])
  expect(result.historicalCount).toBe(0)
})

test('reconciliación: propaga el error sin devolver versiones antiguas', async () => {
  const { client } = concurrentDatabase([row(1, 'approved')], [row(1)], [], true)
  await expect(loadRequests(client, '', 1)).rejects.toThrow('Relectura denegada')
})

test('reconciliación: puede regresar al estado operativo según la nueva lectura', async () => {
  const current = { ...row(1, 'approved'), comments: 'Volvió a operativo' }
  const { client } = concurrentDatabase([row(1, 'pending')], [row(1, 'cancelled')], [current])
  const result = await loadRequests(client, '', 1)
  expect(result.rows).toEqual([current])
  expect(result.historicalCount).toBe(0)
})

test('reconciliación: selección de detalle encuentra una única versión con relaciones actualizadas', async () => {
  const current = {
    ...row(1), requester: { full_name: 'Solicitante actualizado', email: 'updated@example.invalid' },
    request_items: [{ id: 'detail', quantity_requested: 2, quantity_approved: 2, quantity_delivered: 1,
      items: { id: 'item', name: 'Artículo actualizado', item_units: [{ asset_code: 'UNIT-1' }] } }],
    request_groups: [{ id: 'group', group_name: 'Grupo actualizado', request_group_items: [{ item_id: 'item', quantity: 2 }] }],
    loans: [{ id: 'loan', status: 'active', loan_items: [{ item_id: 'item', quantity: 1 }] }],
  }
  const { client } = concurrentDatabase([row(1, 'approved')], [row(1)], [current])
  const result = await loadRequests(client, '', 1)
  const selected = result.rows.find((entry) => entry.id === current.id)
  expect(result.rows.filter((entry) => entry.id === current.id)).toHaveLength(1)
  expect(selected).toEqual(current)
  expect(getVisibleRequestStatus(selected!)).toBe('partial_delivery')
})

test('reconciliación: conserva normalización y prioridad visual después de la relectura', async () => {
  const { compareRequestsByOperationalPriority } = await import('@/lib/request-delivery-status')
  const current = { ...row(1), request_items: [{ quantity_approved: 3, quantity_delivered: 1 }], request_groups: [] }
  const pending = row(2, 'pending')
  const { client } = concurrentDatabase([row(1, 'approved'), pending], [row(1)], [current])
  const result = await loadRequests(client, '', 1)
  const visible = result.rows.map((entry) => ({ ...entry, status: getVisibleRequestStatus(entry) }))
    .sort(compareRequestsByOperationalPriority)
  expect(visible.map((entry) => [entry.id, entry.status])).toEqual([[pending.id, 'pending'], [current.id, 'partial_delivery']])
})

test('reconciliación: Fase 1 sigue mostrando pendientes tras más de 100 históricos', async () => {
  const pending = Array.from({ length: 4 }, (_, i) => row(200 + i, 'pending'))
  const { client, calls } = database([...closed, ...closed.map((entry) => ({ ...entry, id: `extra-${entry.id}` })), ...pending])
  const result = await loadRequests(client, '', 1)
  expect(result.total).toBe(4)
  expect(result.rows.filter((entry) => entry.status === 'pending')).toEqual(pending)
  expect(result.historicalCount).toBe(100)
  expect(calls).toHaveLength(3)
})
