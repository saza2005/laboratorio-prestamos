'use client'

import { useMemo, useState } from 'react'
import { normalizeSearchText } from '@/lib/item-format'
import { DetailDrawer } from '@/components/detail-drawer'
import { PaginationControls } from '@/components/pagination-controls'
import { formatDateTime } from '@/lib/format-date'
import { formatInventoryStatus, formatItemType, formatMovementType, inventoryStatusBadgeClass } from '@/lib/status-format'

type InventoryItem = {
  id: string
  code: string
  name: string
  category: string | null
  item_type: string
  track_individual: boolean
  stock_total: number
  stock_available: number
  status: string
  location: string | null
  asset_codes: string[]
  unit_conditions: string[]
  unit_availability_statuses: string[]
}

type ItemHistoryEntry = {
  id: string
  date: string | null
  type: string
  title: string
  description: string
  quantity?: number
  user?: string
}

const PAGE_SIZE = 50

function formatHistoryType(type: string) {
  if (type === 'loan') return 'Préstamo'
  if (type === 'return') return 'Devolución'
  if (type.startsWith('maintenance_')) return 'Mantenimiento'
  return formatMovementType(type)
}

function getOperationalItemStatus(item: InventoryItem) {
  if (item.status !== 'active') return item.status

  if (!item.track_individual || item.unit_availability_statuses.length === 0) {
    return item.status
  }

  if (item.stock_available > 0) return item.status

  if (item.unit_conditions.includes('maintenance')) {
    return 'maintenance'
  }

  if (
    item.unit_conditions.some((condition) =>
      condition === 'damaged' || condition === 'retired'
    ) ||
    item.unit_availability_statuses.every(
      (availability) => availability === 'unavailable'
    )
  ) {
    return 'inactive'
  }

  return item.status
}
function historyTypeClass(type: string) {
  if (type === 'loan') {
    return 'bg-blue-50 text-blue-700 ring-blue-200'
  }

  if (type === 'return') {
    return 'bg-green-50 text-green-700 ring-green-200'
  }

  if (type === 'return_damaged' || type === 'return_missing') {
    return 'bg-rose-50 text-rose-700 ring-rose-200'
  }

  if (type.startsWith('maintenance_')) {
    return 'bg-amber-50 text-amber-700 ring-amber-200'
  }

  if (type === 'loan_out') {
    return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
  }

  if (type === 'return_ok') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  }

  if (type === 'adjustment_up') {
    return 'bg-teal-50 text-teal-700 ring-teal-200'
  }

  if (type === 'adjustment_down') {
    return 'bg-orange-50 text-orange-700 ring-orange-200'
  }

  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

export function InventoryList({
  items,
  histories,
}: {
  items: InventoryItem[]
  histories?: Record<string, ItemHistoryEntry[]>
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

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
    const query = normalizeSearchText(search)

    return items.filter((item) => {
      const matchesCategory = !category || item.category === category
      const operationalStatus = getOperationalItemStatus(item)
      const matchesStatus = !status || operationalStatus === status
      const matchesSearch =
        !query ||
        normalizeSearchText(item.name).includes(query) ||
        normalizeSearchText(item.code).includes(query) ||
        item.asset_codes.some((code) => normalizeSearchText(code).includes(query)) ||
        normalizeSearchText(item.category).includes(query) ||
        normalizeSearchText(item.location).includes(query)

      return matchesCategory && matchesStatus && matchesSearch
    })
  }, [category, items, search, status])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const selectedItem = selectedItemId
    ? filteredItems.find((item) => item.id === selectedItemId) ?? null
    : null
  const selectedHistory = selectedItem ? histories?.[selectedItem.id] ?? [] : []

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
    setSelectedItemId(null)
  }

  function updateCategory(value: string) {
    setCategory(value)
    setPage(1)
    setSelectedItemId(null)
  }

  function updateStatus(value: string) {
    setStatus(value)
    setPage(1)
    setSelectedItemId(null)
  }

  function clearFilters() {
    setSearch('')
    setCategory('')
    setStatus('')
    setPage(1)
    setSelectedItemId(null)
  }

  const hasFilters = Boolean(search || category || status)

  return (
    <section className="rounded-2xl bg-white p-4 shadow sm:p-6">
      <div className="mb-4 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Ítems registrados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Resultados: {filteredItems.length} de {items.length}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_minmax(180px,240px)_minmax(160px,220px)_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Buscar por nombre, código interno, código patrimonial, categoría o ubicación"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={category}
            onChange={(event) => updateCategory(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todas las categorías</option>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => updateStatus(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
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

      {pageItems.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[132px_minmax(0,1.3fr)_minmax(0,1fr)_96px_108px_108px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Código</span>
              <span>Nombre</span>
              <span>Categoría</span>
              <span>Disponible</span>
              <span>Total</span>
              <span>Estado</span>
            </div>

            <div className="divide-y divide-slate-200">
              {pageItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[132px_minmax(0,1.3fr)_minmax(0,1fr)_96px_108px_108px] md:items-center md:gap-3 ${
                    selectedItem?.id === item.id ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <span className="font-medium text-slate-800">{item.code}</span>
                  <span className="min-w-0 truncate text-slate-800">{item.name}</span>
                  <span className="min-w-0 truncate text-slate-600">{item.category || '-'}</span>
                  <span className={item.stock_available > 0 ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>
                    {item.stock_available}
                  </span>
                  <span className="text-slate-600">{item.stock_total}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${inventoryStatusBadgeClass(
                      getOperationalItemStatus(item)
                    )}`}
                  >
                    {formatInventoryStatus(getOperationalItemStatus(item))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <DetailDrawer isOpen={Boolean(selectedItem)} onClose={() => setSelectedItemId(null)}>
            {selectedItem && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{selectedItem.code}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedItem.name}
                    </h3>
                    <p className="text-sm text-slate-600">{selectedItem.category || '-'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${inventoryStatusBadgeClass(
                        getOperationalItemStatus(selectedItem)
                      )}`}
                    >
                      {formatInventoryStatus(getOperationalItemStatus(selectedItem))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(null)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Total</span>
                    <span className="font-semibold">{selectedItem.stock_total}</span>
                  </p>
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Disponible</span>
                    <span className="font-semibold text-green-700">{selectedItem.stock_available}</span>
                  </p>
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Tipo</span>
                    <span className="font-semibold">{formatItemType(selectedItem.item_type)}</span>
                  </p>
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Seguimiento</span>
                    <span className="font-semibold">
                      {selectedItem.track_individual ? 'Individual' : 'Cantidad'}
                    </span>
                  </p>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-slate-700">Ubicación</p>
                    <p className="mt-1 text-slate-600">{selectedItem.location || '-'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Categoría</p>
                    <p className="mt-1 text-slate-600">{selectedItem.category || '-'}</p>
                  </div>
                </div>

                {selectedItem.asset_codes.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <p className="font-medium text-slate-700">Códigos patrimoniales</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedItem.asset_codes.map((code) => (
                        <span
                          key={code}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-700">Historial reciente</p>
                    <span className="text-xs text-slate-500">Últimos {selectedHistory.length}</span>
                  </div>

                  {selectedHistory.length > 0 ? (
                    <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {selectedHistory.map((entry) => (
                        <div key={`${entry.type}-${entry.id}`} className="px-3 py-3 text-sm">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${historyTypeClass(entry.type)}`}
                                >
                                  {formatHistoryType(entry.type)}
                                </span>
                                <p className="font-medium text-slate-800">{entry.title}</p>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDateTime(entry.date)}
                              </p>
                            </div>
                            {typeof entry.quantity === 'number' && (
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                Cantidad {entry.quantity}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-slate-600">{entry.description}</p>
                          {entry.user && (
                            <p className="mt-1 text-xs text-slate-500">Responsable: {entry.user}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                      Sin movimientos recientes registrados para este ítem.
                    </p>
                  )}
                </div>
              </div>
            )}
          </DetailDrawer>
        </>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay ítems que coincidan con los filtros.
        </p>
      )}

      {filteredItems.length > PAGE_SIZE && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setPage((value) => Math.max(1, value - 1))}
          onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
          className="mt-4"
        />
      )}
    </section>
  )
}
