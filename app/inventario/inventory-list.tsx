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
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="space-y-4 border-b p-4 sm:p-6">
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

      <div className="divide-y md:hidden">
        {pageItems.length > 0 ? (
          pageItems.map((item) => (
            <div key={item.id} className="space-y-2 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-slate-500">{item.code}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                  {formatStatus(item.status)}
                </span>
              </div>
              <p><span className="font-medium">Categoría:</span> {item.category || '-'}</p>
              <p><span className="font-medium">Tipo:</span> {item.item_type}</p>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-center">
                <p><span className="block text-xs text-slate-500">Stock total</span>{item.stock_total}</p>
                <p><span className="block text-xs text-slate-500">Disponible</span>{item.stock_available}</p>
              </div>
              <p><span className="font-medium">Seguimiento:</span> {item.track_individual ? 'Sí' : 'No'}</p>
              <p><span className="font-medium">Ubicación:</span> {item.location || '-'}</p>
            </div>
          ))
        ) : (
          <p className="p-6 text-center text-slate-500">No hay ítems que coincidan con los filtros.</p>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[1080px] text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Seguimiento</th>
              <th className="px-4 py-3 text-left">Stock total</th>
              <th className="px-4 py-3 text-left">Disponible</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length > 0 ? (
              pageItems.map((item) => (
                <tr key={item.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{item.code}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.category || '-'}</td>
                  <td className="px-4 py-3">{item.item_type}</td>
                  <td className="px-4 py-3">{item.track_individual ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-3">{item.stock_total}</td>
                  <td className="px-4 py-3">{item.stock_available}</td>
                  <td className="px-4 py-3">{formatStatus(item.status)}</td>
                  <td className="px-4 py-3">{item.location || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                  No hay ítems que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredItems.length > PAGE_SIZE && (
        <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
    </div>
  )
}
