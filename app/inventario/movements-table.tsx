'use client'

import { useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import { formatDateTime } from '@/lib/format-date'
import { normalizeSearchText } from '@/lib/item-format'
import { formatMovementType, movementTypeBadgeClass } from '@/lib/status-format'

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
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return data.filter((m) => {
      const text = normalizeSearchText(search)

      const matchesSearch =
        normalizeSearchText(m.item_name).includes(text) ||
        normalizeSearchText(m.item_code).includes(text) ||
        normalizeSearchText(m.user_name).includes(text) ||
        normalizeSearchText(m.notes).includes(text)

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

  const selectedMovement = selectedMovementId
    ? filtered.find((movement) => movement.id === selectedMovementId) ?? null
    : null

  function closeMovement() {
    setSelectedMovementId(null)
  }

  function clearFilters() {
    setSearch('')
    setTypeFilter('')
    setFromDate('')
    setToDate('')
    setSelectedMovementId(null)
  }

  const hasFilters = Boolean(search || typeFilter || fromDate || toDate)

  return (
    <section className="surface-card mt-8 p-4 sm:p-6">
      <div className="mb-4 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Movimientos de inventario</h2>
          <p className="mt-1 text-sm text-slate-500">
            Resultados: {filtered.length}
            {limit ? ` de los últimos ${limit} movimientos` : ''}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(300px,1fr)_160px_160px_160px_auto]">
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
            <option value="adjustment_up">Ajuste +</option>
            <option value="adjustment_down">Ajuste -</option>
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
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
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
                  className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[128px_132px_minmax(0,1.2fr)_92px_minmax(0,1fr)] md:items-center md:gap-3 ${
                    selectedMovement?.id === movement.id ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedMovementId(movement.id)}
                >
                  <span className="text-slate-500">{formatDateTime(movement.created_at)}</span>
                  <span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${movementTypeBadgeClass(
                        movement.type
                      )}`}
                    >
                      {formatMovementType(movement.type)}
                    </span>
                  </span>
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

          <DetailDrawer isOpen={Boolean(selectedMovement)} onClose={closeMovement}>
            {selectedMovement && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(selectedMovement.created_at)}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedMovement.item_name}
                    </h3>
                    <p className="text-sm text-slate-500">{selectedMovement.item_code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeMovement}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Tipo</span>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${movementTypeBadgeClass(
                        selectedMovement.type
                      )}`}
                    >
                      {formatMovementType(selectedMovement.type)}
                    </span>
                  </p>
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Cantidad</span>
                    <span className="font-semibold">{selectedMovement.quantity}</span>
                  </p>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-slate-700">Usuario</p>
                    <p className="mt-1 text-slate-600">{selectedMovement.user_name}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Notas</p>
                    <p className="mt-1 text-slate-600">{selectedMovement.notes || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </DetailDrawer>
        </>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay movimientos que coincidan con los filtros.
        </p>
      )}
    </section>
  )
}
