'use client'

import { useMemo, useState } from 'react'

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
}

const PAGE_SIZE = 50

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase('es') ?? ''
}

function formatStatus(status: string) {
  switch (status) {
    case 'active':
      return 'Activo'
    case 'inactive':
      return 'Inactivo'
    case 'maintenance':
      return 'Mantenimiento'
    default:
      return status
  }
}

export function InventoryList({ items }: { items: InventoryItem[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

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
    const query = normalize(search)

    return items.filter((item) => {
      const matchesCategory = !category || item.category === category
      const matchesStatus = !status || item.status === status
      const matchesSearch =
        !query ||
        normalize(item.name).includes(query) ||
        normalize(item.code).includes(query) ||
        item.asset_codes.some((code) => normalize(code).includes(query)) ||
        normalize(item.category).includes(query) ||
        normalize(item.location).includes(query)

      return matchesCategory && matchesStatus && matchesSearch
    })
  }, [category, items, search, status])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function updateCategory(value: string) {
    setCategory(value)
    setPage(1)
  }

  function updateStatus(value: string) {
    setStatus(value)
    setPage(1)
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow sm:p-6">
      <div className="mb-4 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Ítems registrados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Resultados: {filteredItems.length} de {items.length}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_minmax(180px,240px)_minmax(160px,220px)]">
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
        </div>
      </div>

      {pageItems.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
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
                  className="grid w-full gap-2 bg-white px-4 py-3 text-left text-sm transition hover:bg-slate-50 md:grid-cols-[132px_minmax(0,1.3fr)_minmax(0,1fr)_96px_108px_108px] md:items-center md:gap-3"
                  onClick={() => {
                    const element = document.getElementById(`inventory-detail-${item.id}`)
                    element?.scrollIntoView({ block: 'nearest' })
                  }}
                >
                  <span className="font-medium text-slate-800">{item.code}</span>
                  <span className="min-w-0 truncate text-slate-800">{item.name}</span>
                  <span className="min-w-0 truncate text-slate-600">{item.category || '-'}</span>
                  <span className={item.stock_available > 0 ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>
                    {item.stock_available}
                  </span>
                  <span className="text-slate-600">{item.stock_total}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {formatStatus(item.status)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 xl:sticky xl:top-4 xl:self-start">
            <p className="mb-3 text-sm font-medium text-slate-700">Detalle rápido</p>
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {pageItems.map((item) => (
                <div
                  key={item.id}
                  id={`inventory-detail-${item.id}`}
                  className="rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.code}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-700">
                      {formatStatus(item.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <p className="rounded bg-white px-2 py-2"><span className="block text-xs text-slate-500">Total</span>{item.stock_total}</p>
                    <p className="rounded bg-white px-2 py-2"><span className="block text-xs text-slate-500">Disponible</span>{item.stock_available}</p>
                  </div>
                  <div className="mt-3 space-y-1 text-slate-600">
                    <p><span className="font-medium text-slate-700">Categoría:</span> {item.category || '-'}</p>
                    <p><span className="font-medium text-slate-700">Tipo:</span> {item.item_type}</p>
                    <p><span className="font-medium text-slate-700">Seguimiento:</span> {item.track_individual ? 'Individual' : 'Por cantidad'}</p>
                    <p><span className="font-medium text-slate-700">Ubicación:</span> {item.location || '-'}</p>
                    {item.asset_codes.length > 0 && (
                      <p><span className="font-medium text-slate-700">Patrimoniales:</span> {item.asset_codes.slice(0, 4).join(', ')}{item.asset_codes.length > 4 ? ` +${item.asset_codes.length - 4}` : ''}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay ítems que coincidan con los filtros.
        </p>
      )}

      {filteredItems.length > PAGE_SIZE && (
        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Página {currentPage} de {totalPages}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
