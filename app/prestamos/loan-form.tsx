'use client'

import { useActionState, useMemo, useState } from 'react'
import { createLoanWithState } from './actions'

type Item = {
  id: string
  name: string
  code: string
  stock_available: number
  category: string | null
  track_individual: boolean
}

type ItemUnit = {
  id: string
  item_id: string
  asset_code: string | null
  serial_code: string | null
  brand: string | null
  model: string | null
}

type User = {
  id: string
  full_name: string
  role: string
}

type LoanRow = {
  itemId: string
  itemUnitId: string
  quantity: number
}

const SELECT_OPTIONS_LIMIT = 100

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase('es') ?? ''
}

export function LoanForm({
  users,
  items,
  availableUnits,
  minExpectedReturnDate,
}: {
  users: User[]
  items: Item[]
  availableUnits: ItemUnit[]
  minExpectedReturnDate: string
}) {
  const [state, formAction, isPending] = useActionState(createLoanWithState, {
    error: null,
  })
  const [selectedUserId, setSelectedUserId] = useState('')
  const [rows, setRows] = useState<LoanRow[]>([
    { itemId: '', itemUnitId: '', quantity: 1 },
  ])
  const [itemSearch, setItemSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  )

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.category?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [items]
  )

  const filteredItems = useMemo(() => {
    const query = normalize(itemSearch)
    return items.filter((item) => {
      const matchesCategory = !categoryFilter || item.category === categoryFilter
      const matchesSearch =
        !query ||
        normalize(item.name).includes(query) ||
        normalize(item.code).includes(query) ||
        normalize(item.category).includes(query)
      return matchesCategory && matchesSearch
    })
  }, [categoryFilter, itemSearch, items])

  const visibleItems = filteredItems.slice(0, SELECT_OPTIONS_LIMIT)
  const selectedUnitIds = rows.map((row) => row.itemUnitId).filter(Boolean)

  const requestedTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of rows) {
      if (!row.itemId) continue
      const item = itemMap.get(row.itemId)
      const quantity = item?.track_individual ? 1 : row.quantity
      totals.set(row.itemId, (totals.get(row.itemId) ?? 0) + quantity)
    }
    return totals
  }, [itemMap, rows])

  const hasErrors = rows.some((row) => {
    const item = itemMap.get(row.itemId)
    if (!item) return true
    const quantity = item.track_individual ? 1 : row.quantity
    const total = requestedTotals.get(item.id) ?? 0
    return (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      total > item.stock_available ||
      (item.track_individual && !row.itemUnitId)
    )
  }) || new Set(selectedUnitIds).size !== selectedUnitIds.length

  function updateRow(index: number, changes: Partial<LoanRow>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...changes } : row
      )
    )
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { itemId: '', itemUnitId: '', quantity: 1 },
    ])
  }

  function removeRow(index: number) {
    setRows((current) =>
      current.length === 1
        ? current
        : current.filter((_, rowIndex) => rowIndex !== index)
    )
  }

  function getSelectableItems(selectedItemId: string) {
    if (!selectedItemId || visibleItems.some((item) => item.id === selectedItemId)) {
      return visibleItems
    }
    const selectedItem = itemMap.get(selectedItemId)
    return selectedItem ? [selectedItem, ...visibleItems] : visibleItems
  }

  const canSubmit = Boolean(selectedUserId) && !hasErrors && !isPending

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(event) => {
        if (!confirm('¿Seguro que deseas registrar este préstamo?')) {
          event.preventDefault()
        }
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Usuario</label>
          <select
            name="user_id"
            required
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            disabled={isPending || users.length === 0}
            className="w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Seleccione</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} ({user.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Fecha esperada de devolución</label>
          <input
            name="expected_return_date"
            type="date"
            min={minExpectedReturnDate}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(240px,1fr)_minmax(190px,260px)]">
        <input
          type="search"
          value={itemSearch}
          onChange={(event) => setItemSearch(event.target.value)}
          placeholder="Buscar material por nombre, código o categoría"
          className="rounded-lg border bg-white px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500 md:col-span-2">
          Coincidencias: {filteredItems.length} de {items.length}.
          {filteredItems.length > SELECT_OPTIONS_LIMIT
            ? ` Mostrando las primeras ${SELECT_OPTIONS_LIMIT}; afine la búsqueda.`
            : ''}
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => {
          const item = itemMap.get(row.itemId)
          const selectableItems = getSelectableItems(row.itemId)
          const units = item?.track_individual
            ? availableUnits.filter((unit) => unit.item_id === item.id)
            : []
          const quantity = item?.track_individual ? 1 : row.quantity
          const total = item ? requestedTotals.get(item.id) ?? 0 : 0
          const exceedsStock = Boolean(item && total > item.stock_available)

          return (
            <div key={index} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-medium">Material {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Quitar
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-7">
                  <label className="mb-1 block text-sm font-medium">Ítem</label>
                  <select
                    value={row.itemId}
                    onChange={(event) =>
                      updateRow(index, {
                        itemId: event.target.value,
                        itemUnitId: '',
                        quantity: 1,
                      })
                    }
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">Seleccione</option>
                    {selectableItems.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} [{option.code}] - Stock: {option.stock_available}
                      </option>
                    ))}
                  </select>
                  <input type="hidden" name={`items[${index}][item_id]`} value={row.itemId} />
                </div>

                <div className="md:col-span-5">
                  <label className="mb-1 block text-sm font-medium">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    max={item?.stock_available || undefined}
                    step="1"
                    value={quantity}
                    readOnly={item?.track_individual}
                    onChange={(event) =>
                      updateRow(index, { quantity: Math.max(1, Number(event.target.value) || 1) })
                    }
                    className="w-full rounded-lg border px-3 py-2 read-only:bg-slate-100"
                  />
                  <input type="hidden" name={`items[${index}][quantity]`} value={quantity} />
                </div>

                {item?.track_individual && (
                  <div className="md:col-span-12">
                    <label className="mb-1 block text-sm font-medium">Unidad patrimonial</label>
                    <select
                      value={row.itemUnitId}
                      onChange={(event) => updateRow(index, { itemUnitId: event.target.value })}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value="">Seleccione una unidad disponible</option>
                      {units.map((unit) => (
                        <option
                          key={unit.id}
                          value={unit.id}
                          disabled={selectedUnitIds.includes(unit.id) && row.itemUnitId !== unit.id}
                        >
                          {unit.asset_code || unit.serial_code || 'Sin código'}
                          {unit.brand || unit.model ? ` - ${[unit.brand, unit.model].filter(Boolean).join(' ')}` : ''}
                        </option>
                      ))}
                    </select>
                    <input type="hidden" name={`items[${index}][item_unit_id]`} value={row.itemUnitId} />
                  </div>
                )}
              </div>

              {item && (
                <p className={`mt-2 text-sm ${exceedsStock ? 'text-red-600' : 'text-slate-600'}`}>
                  Solicitado en este préstamo: {total} de {item.stock_available} disponibles
                </p>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
      >
        Agregar otro material
      </button>

      <div>
        <label className="mb-1 block text-sm font-medium">Notas</label>
        <textarea name="notes" rows={3} className="w-full rounded-lg border px-3 py-2" />
      </div>

      <div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar préstamo'}
        </button>

        {hasErrors && (
          <p className="mt-2 text-sm text-slate-500">
            Complete los materiales, cantidades y unidades patrimoniales antes de guardar.
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
