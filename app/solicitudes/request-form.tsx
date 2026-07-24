'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { formatAssetCodes, normalizeSearchText } from '@/lib/item-format'
import { useIsHydrated } from '@/lib/use-is-hydrated'
import { createRequestWithState } from './actions'

type ItemOption = {
  id: string
  name: string
  code: string
  stock_available: number
  item_type: string | null
  category: string | null
  asset_codes: string[]
}

type RequestRow = {
  item_id: string
  quantity_requested: number
}

type RequestFormProps = {
  items: ItemOption[]
  minScheduledReturnDate: string
}

const RESULTS_LIMIT = 12

export function RequestForm({
  items,
  minScheduledReturnDate,
}: RequestFormProps) {
  const [state, formAction, isPending] = useActionState(createRequestWithState, {
    error: null,
  })
  const [rows, setRows] = useState<RequestRow[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [addedItemName, setAddedItemName] = useState('')
  const mounted = useIsHydrated()

  const selectedIds = rows.map((row) => row.item_id)

  const itemMap = useMemo(() => {
    return new Map(items.map((item) => [item.id, item]))
  }, [items])

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => item.category?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, 'es'))
  }, [items])

  const filteredItems = useMemo(() => {
    const query = normalizeSearchText(itemSearch)

    return items.filter((item) => {
      const matchesCategory = !categoryFilter || item.category === categoryFilter
      const matchesSearch =
        !query ||
        normalizeSearchText(item.name).includes(query) ||
        normalizeSearchText(item.code).includes(query) ||
        item.asset_codes.some((code) => normalizeSearchText(code).includes(query)) ||
        normalizeSearchText(item.category).includes(query)

      return matchesCategory && matchesSearch
    })
  }, [categoryFilter, itemSearch, items])

  const availableResults = filteredItems.filter(
    (item) => !selectedIds.includes(item.id) && item.stock_available > 0
  )
  const visibleResults = availableResults.slice(0, RESULTS_LIMIT)
  const selectedRows = rows
    .map((row) => ({ row, item: itemMap.get(row.item_id) }))
    .filter((entry): entry is { row: RequestRow; item: ItemOption } =>
      Boolean(entry.item)
    )

  const hasErrors =
    rows.length === 0 ||
    selectedRows.length !== rows.length ||
    selectedRows.some(({ row, item }) => {
      return (
        !Number.isInteger(row.quantity_requested) ||
        row.quantity_requested < 1 ||
        row.quantity_requested > item.stock_available
      )
    })

  useEffect(() => {
    if (!addedItemName) return

    const timeout = window.setTimeout(() => {
      setAddedItemName('')
    }, 2600)

    return () => window.clearTimeout(timeout)
  }, [addedItemName])

  function addItem(item: ItemOption) {
    if (selectedIds.includes(item.id) || item.stock_available < 1) return

    setRows((current) => [
      ...current,
      { item_id: item.id, quantity_requested: 1 },
    ])
    setItemSearch('')
    setAddedItemName(item.name)
  }

  function updateQuantity(itemId: string, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.item_id === itemId
          ? { ...row, quantity_requested: Number(value) || 1 }
          : row
      )
    )
  }

  function removeItem(itemId: string) {
    setRows((current) => current.filter((row) => row.item_id !== itemId))
  }

  function clearFilters() {
    setItemSearch('')
    setCategoryFilter('')
  }

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      {addedItemName && (
        <div className="fixed left-4 top-24 z-50 max-w-[calc(100vw-2rem)] rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-lg sm:max-w-sm" role="status" aria-live="polite">
          <p className="font-medium">Ítem agregado en la parte inferior</p>
          <p className="mt-1 truncate">{addedItemName}</p>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium">Propósito</label>
        <input
          name="purpose"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Práctica de laboratorio / clase / proyecto"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Fecha estimada de devolución
        </label>
        <input
          name="scheduled_return_date"
          type="date"
          min={minScheduledReturnDate}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium">Comentarios</label>
        <textarea
          name="comments"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Detalle adicional de la solicitud"
        />
      </div>

      <div className="md:col-span-2">
        <h3 className="mb-3 text-lg font-semibold">Ítems solicitados</h3>

        <div className="mb-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)_auto]">
            <input
              type="search"
              value={itemSearch}
              onChange={(event) => setItemSearch(event.target.value)}
              placeholder="Buscar por nombre, código interno, código patrimonial o categoría"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>

          <div className="text-sm text-slate-500">
            Coincidencias disponibles: {availableResults.length} de {items.length}.
            {availableResults.length > RESULTS_LIMIT
              ? ` Mostrando ${RESULTS_LIMIT}; afine la búsqueda para ver otras.`
              : ''}
          </div>

          {visibleResults.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {visibleResults.map((item) => {
                const assetCodes = formatAssetCodes(item.asset_codes)

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addItem(item)}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <span className="block font-medium text-slate-900">
                      {item.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Código interno: {item.code}
                      {assetCodes ? ` | Patrimonial: ${assetCodes}` : ''}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      Stock: {item.stock_available} | Categoría:{' '}
                      {item.category || 'Sin categoría'}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
              No hay ítems disponibles que coincidan con la búsqueda.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">Ítems agregados</p>
            <p className="text-sm text-slate-500">Total: {selectedRows.length}</p>
          </div>

          {selectedRows.length > 0 ? (
            <div className="space-y-3">
              {selectedRows.map(({ row, item }) => {
                const exceedsStock = row.quantity_requested > item.stock_available
                const assetCodes = formatAssetCodes(item.asset_codes)

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Código interno: {item.code}
                          {assetCodes ? ` | Patrimonial: ${assetCodes}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          Disponible: {item.stock_available}
                        </p>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={item.stock_available}
                          step="1"
                          value={row.quantity_requested}
                          onChange={(event) =>
                            updateQuantity(item.id, event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 transition hover:bg-red-100"
                      >
                        Quitar
                      </button>
                    </div>

                    <input type="hidden" name="item_id" value={item.id} />
                    <input
                      type="hidden"
                      name="quantity_requested"
                      value={row.quantity_requested}
                    />

                    {exceedsStock && (
                      <p className="mt-2 text-sm text-red-600">
                        La cantidad excede el stock disponible.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-white px-3 py-4 text-center text-sm text-slate-500">
              Busca un ítem y selecciónalo para agregarlo a la solicitud.
            </p>
          )}
        </div>
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          suppressHydrationWarning
          disabled={!mounted || hasErrors || isPending}
          className={`w-full rounded-lg px-5 py-2.5 font-medium transition sm:w-auto ${
            hasErrors
              ? 'cursor-not-allowed bg-gray-400 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isPending ? 'Enviando...' : 'Enviar solicitud'}
        </button>

        {hasErrors && (
          <p className="mt-2 text-sm text-slate-500">
            Agrega al menos un ítem y verifica que las cantidades no excedan el stock disponible.
          </p>
        )}

        {state.error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
      </div>
    </form>
  )
}
