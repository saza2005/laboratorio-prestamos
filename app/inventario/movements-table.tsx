'use client'

import { useMemo, useState } from 'react'
import { formatDateTime } from '@/lib/format-date'

type Movement = {
  id: string
  type: string
  quantity: number
  notes: string | null
  created_at: string
  item_name: string
  item_code: string
  user_name: string
}

function formatMovementType(type: string) {
  switch (type) {
    case 'loan_out':
      return 'Préstamo'
    case 'return_ok':
      return 'Devolución OK'
    case 'return_damaged':
      return 'Devuelto dañado'
    case 'return_missing':
      return 'Reportado faltante'
    case 'adjustment_up':
      return 'Ajuste positivo'
    case 'adjustment_down':
      return 'Ajuste negativo'
    default:
      return type
  }
}

export function MovementsTable({
  data,
  limit,
}: {
  data: Movement[]
  limit?: number
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const filtered = useMemo(() => {
    return data.filter((m) => {
      const text = search.toLowerCase()

      const matchesSearch =
        m.item_name.toLowerCase().includes(text) ||
        m.item_code.toLowerCase().includes(text) ||
        m.user_name.toLowerCase().includes(text) ||
        (m.notes ?? '').toLowerCase().includes(text)

      const matchesType = typeFilter ? m.type === typeFilter : true

      const movementDate = new Date(m.created_at)

      const matchesFrom = fromDate
        ? movementDate >= new Date(fromDate)
        : true

      const matchesTo = toDate
        ? movementDate <= new Date(toDate + 'T23:59:59')
        : true

      return matchesSearch && matchesType && matchesFrom && matchesTo
    })
  }, [data, search, typeFilter, fromDate, toDate])

  return (
    <section className="mt-8 rounded-2xl bg-white p-4 shadow sm:p-6">
      <div className="mb-4 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Movimientos de inventario</h2>
          <p className="mt-1 text-sm text-slate-500">
            Resultados: {filtered.length}
            {limit ? ` de los últimos ${limit} movimientos` : ''}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Buscar por ítem, código, usuario o notas"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="loan_out">Préstamo</option>
            <option value="return_ok">Devolución OK</option>
            <option value="return_damaged">Dañado</option>
            <option value="return_missing">Faltante</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[128px_132px_minmax(0,1.2fr)_92px_minmax(0,1fr)] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Fecha</span>
              <span>Tipo</span>
              <span>Ítem</span>
              <span>Cantidad</span>
              <span>Usuario</span>
            </div>

            <div className="divide-y divide-slate-200">
              {filtered.map((movement) => (
                <button
                  key={movement.id}
                  type="button"
                  className="grid w-full gap-2 bg-white px-4 py-3 text-left text-sm transition hover:bg-slate-50 md:grid-cols-[128px_132px_minmax(0,1.2fr)_92px_minmax(0,1fr)] md:items-center md:gap-3"
                  onClick={() => {
                    const element = document.getElementById(`movement-detail-${movement.id}`)
                    element?.scrollIntoView({ block: 'nearest' })
                  }}
                >
                  <span className="text-slate-500">{formatDateTime(movement.created_at)}</span>
                  <span className="font-medium text-slate-800">{formatMovementType(movement.type)}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">{movement.item_name}</span>
                    <span className="block truncate text-xs text-slate-500">{movement.item_code}</span>
                  </span>
                  <span className="font-semibold text-slate-800">{movement.quantity}</span>
                  <span className="truncate text-slate-600">{movement.user_name}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 xl:sticky xl:top-4 xl:self-start">
            <p className="mb-3 text-sm font-medium text-slate-700">Detalle de movimiento</p>
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {filtered.map((movement) => (
                <div
                  key={movement.id}
                  id={`movement-detail-${movement.id}`}
                  className="rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <p className="text-xs text-slate-500">{formatDateTime(movement.created_at)}</p>
                  <h3 className="mt-1 font-semibold text-slate-900">{movement.item_name}</h3>
                  <p className="text-xs text-slate-500">{movement.item_code}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <p className="rounded bg-white px-2 py-2"><span className="block text-xs text-slate-500">Tipo</span>{formatMovementType(movement.type)}</p>
                    <p className="rounded bg-white px-2 py-2"><span className="block text-xs text-slate-500">Cantidad</span>{movement.quantity}</p>
                  </div>
                  <div className="mt-3 space-y-1 text-slate-600">
                    <p><span className="font-medium text-slate-700">Usuario:</span> {movement.user_name}</p>
                    <p><span className="font-medium text-slate-700">Notas:</span> {movement.notes || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay movimientos que coincidan con los filtros.
        </p>
      )}
    </section>
  )
}
