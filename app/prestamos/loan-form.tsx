'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { formatAssetCodes, normalizeSearchText } from '@/lib/item-format'
import { useConfirmSubmit } from '@/components/confirm-submit'
import { createLoanWithState } from './actions'
import { ItemAddedToast } from '@/components/item-added-toast'
import { stockAvailabilityBadgeClass } from '@/lib/status-format'
import { filterProfilesForSelection } from '@/lib/profile-search'

type Item = {
  id: string
  name: string
  code: string
  stock_available: number
  category: string | null
  track_individual: boolean
  asset_codes: string[]
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
  email: string
  role: string
}

type LoanRow = {
  itemId: string
  itemUnitId: string
  quantity: number
}

const RESULTS_LIMIT = 12

function formatUnitLabel(unit: ItemUnit) {
  const code = unit.asset_code || unit.serial_code || 'Sin código'
  const details = [unit.brand, unit.model].filter(Boolean).join(' ')
  return details ? `${code} - ${details}` : code
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
  const [userSearch, setUserSearch] = useState('')
  const [rows, setRows] = useState<LoanRow[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [addedItemName, setAddedItemName] = useState('')
  const confirmSubmit = useConfirmSubmit({
    title: 'Registrar préstamo',
    message: 'Confirma que deseas registrar este préstamo con los ítems seleccionados.',
    confirmLabel: 'Registrar',
  })

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  )

  const visibleUsers = useMemo(
    () => filterProfilesForSelection(users, userSearch, selectedUserId),
    [selectedUserId, userSearch, users]
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
    const query = normalizeSearchText(itemSearch)
    const selectedNonTrackedIds = rows
      .filter((row) => !itemMap.get(row.itemId)?.track_individual)
      .map((row) => row.itemId)

    return items.filter((item) => {
      const matchesCategory = !categoryFilter || item.category === categoryFilter
      const matchesSearch =
        !query ||
        normalizeSearchText(item.name).includes(query) ||
        normalizeSearchText(item.code).includes(query) ||
        item.asset_codes.some((code) => normalizeSearchText(code).includes(query)) ||
        normalizeSearchText(item.category).includes(query)

      return (
        matchesCategory &&
        matchesSearch &&
        item.stock_available > 0 &&
        !selectedNonTrackedIds.includes(item.id)
      )
    })
  }, [categoryFilter, itemMap, itemSearch, items, rows])

  const visibleItems = filteredItems.slice(0, RESULTS_LIMIT)
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

  const selectedRows = rows
    .map((row) => ({ row, item: itemMap.get(row.itemId) }))
    .filter((entry): entry is { row: LoanRow; item: Item } => Boolean(entry.item))

  const hasErrors =
    rows.length === 0 ||
    selectedRows.length !== rows.length ||
    selectedRows.some(({ row, item }) => {
      const quantity = item.track_individual ? 1 : row.quantity
      const total = requestedTotals.get(item.id) ?? 0
      return (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        total > item.stock_available ||
        (item.track_individual && !row.itemUnitId)
      )
    }) ||
    new Set(selectedUnitIds).size !== selectedUnitIds.length

  function addItem(item: Item) {
    const availableUnit = item.track_individual
      ? availableUnits.find(
          (unit) =>
            unit.item_id === item.id && !selectedUnitIds.includes(unit.id)
        )
      : null

    if (item.track_individual && !availableUnit) return

    setRows((current) => [
      ...current,
      {
        itemId: item.id,
        itemUnitId: '',
        quantity: 1,
      },
    ])
    setAddedItemName(item.name)
    setItemSearch('')
  }

  function updateRow(index: number, changes: Partial<LoanRow>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...changes } : row
      )
    )
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  function clearFilters() {
    setItemSearch('')
    setCategoryFilter('')
  }

  const hasItemFilters = Boolean(itemSearch || categoryFilter)
  const canSubmit = Boolean(selectedUserId) && !hasErrors && !isPending

  useEffect(() => {
    if (!addedItemName) return

    const timeout = window.setTimeout(() => setAddedItemName(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [addedItemName])

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={confirmSubmit.onSubmit}
    >
      {confirmSubmit.dialog}
      <ItemAddedToast itemName={addedItemName} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="loan-user-search"
            className="mb-1 block text-sm font-medium"
          >
            Buscar estudiante o docente
          </label>
          <input
            id="loan-user-search"
            type="search"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Buscar por nombre o correo"
            className="mb-2 w-full rounded-lg border px-3 py-2"
          />
          <label htmlFor="loan-user" className="mb-1 block text-sm font-medium">
            Usuario
          </label>
          <select
            id="loan-user"
            name="user_id"
            required
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            disabled={isPending || users.length === 0}
            className="w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Seleccione</option>
            {visibleUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} · {user.email} ({user.role})
              </option>
            ))}
          </select>
          {visibleUsers.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">
              No se encontraron usuarios con ese criterio.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Fecha esperada de devolución
          </label>
          <input
            aria-label="Fecha esperada de devolución"
            name="expected_return_date"
            type="date"
            min={minExpectedReturnDate}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_minmax(190px,260px)_auto]">
          <input
            type="search"
            value={itemSearch}
            onChange={(event) => setItemSearch(event.target.value)}
            placeholder="Buscar material por nombre, código interno, código patrimonial o categoría"
            className="rounded-lg border bg-white px-3 py-2 text-sm"
          />
          <select
            aria-label="Filtrar materiales por categoría"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-lg border bg-white px-3 py-2 text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {hasItemFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-fit rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm transition hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Coincidencias disponibles: {filteredItems.length} de {items.length}.
          {filteredItems.length > RESULTS_LIMIT
            ? ` Mostrando ${RESULTS_LIMIT}; afine la búsqueda.`
            : ''}
        </p>

        {visibleItems.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {visibleItems.map((item) => {
              const assetCodes = formatAssetCodes(item.asset_codes)
              const availableUnitCount = availableUnits.filter(
                (unit) =>
                  unit.item_id === item.id && !selectedUnitIds.includes(unit.id)
              ).length
              const disabled = item.track_individual && availableUnitCount === 0

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item)}
                  disabled={disabled}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block font-medium text-slate-900">
                    {item.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Código interno: {item.code}
                    {assetCodes ? ` | Patrimonial: ${assetCodes}` : ''}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${stockAvailabilityBadgeClass(
                        item.stock_available
                      )}`}
                    >
                      Stock: {item.stock_available}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                      {item.category || 'Sin categoría'}
                    </span>
                  </span>
                  {item.track_individual && (
                    <span className="mt-1 block text-xs text-blue-700">
                      Unidades disponibles: {availableUnitCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="rounded-lg bg-white px-3 py-4 text-center text-sm text-slate-500">
            No hay materiales disponibles que coincidan con la búsqueda o filtros.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold">Materiales agregados</h3>
          <p className="text-sm text-slate-500">Total: {selectedRows.length}</p>
        </div>

        {selectedRows.length > 0 ? (
          selectedRows.map(({ row, item }, index) => {
            const units = item.track_individual
              ? availableUnits.filter((unit) => unit.item_id === item.id)
              : []
            const quantity = item.track_individual ? 1 : row.quantity
            const total = requestedTotals.get(item.id) ?? 0
            const exceedsStock = total > item.stock_available
            const assetCodes = formatAssetCodes(item.asset_codes)

            return (
              <div key={`${item.id}-${index}`} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Código interno: {item.code}
                      {assetCodes ? ` | Patrimonial: ${assetCodes}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 transition hover:bg-red-100"
                  >
                    Quitar
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-12">
                  <input
                    type="hidden"
                    name={`items[${index}][item_id]`}
                    value={row.itemId}
                  />

                  <div className="md:col-span-5">
                    <label className="mb-1 block text-sm font-medium">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      max={item.stock_available}
                      step="1"
                      value={quantity}
                      readOnly={item.track_individual}
                      onChange={(event) =>
                        updateRow(index, {
                          quantity: Math.max(
                            1,
                            Number(event.target.value) || 1
                          ),
                        })
                      }
                      className="w-full rounded-lg border px-3 py-2 read-only:bg-slate-100"
                    />
                    <input
                      type="hidden"
                      name={`items[${index}][quantity]`}
                      value={quantity}
                    />
                  </div>

                  {item.track_individual && (
                    <div className="md:col-span-7">
                      <label className="mb-1 block text-sm font-medium">
                        Unidad patrimonial
                      </label>
                      <select
                        aria-label={`Unidad patrimonial para ${item.name}`}
                        value={row.itemUnitId}
                        onChange={(event) =>
                          updateRow(index, { itemUnitId: event.target.value })
                        }
                        className="w-full rounded-lg border px-3 py-2"
                      >
                        <option value="">Seleccione una unidad disponible</option>
                        {units.map((unit) => (
                          <option
                            key={unit.id}
                            value={unit.id}
                            disabled={
                              selectedUnitIds.includes(unit.id) &&
                              row.itemUnitId !== unit.id
                            }
                          >
                            {formatUnitLabel(unit)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="hidden"
                        name={`items[${index}][item_unit_id]`}
                        value={row.itemUnitId}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${
                      exceedsStock
                        ? 'bg-red-50 text-red-700 ring-red-200'
                        : 'bg-slate-100 text-slate-700 ring-slate-200'
                    }`}
                  >
                    Solicitado: {total}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${stockAvailabilityBadgeClass(
                      item.stock_available
                    )}`}
                  >
                    Disponible: {item.stock_available}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
            Busca un material y selecciónalo para agregarlo al préstamo.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notas</label>
        <textarea aria-label="Notas del préstamo" name="notes" rows={3} className="w-full rounded-lg border px-3 py-2" />
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
            Selecciona usuario, agrega materiales y completa cantidades o unidades patrimoniales antes de guardar.
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
