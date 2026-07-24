'use client'

import { useMemo, useState } from 'react'
import { normalizeSearchText } from '@/lib/item-format'

type CatalogItem = {
  id: string
  name: string
  code: string
  stock_available: number
  item_type: string | null
  category: string | null
  asset_codes: string[]
}

const PAGE_SIZE = 24

export function ItemsCatalog({ items }: { items: CatalogItem[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

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
    const query = normalizeSearchText(search)

    return items.filter((item) => {
      const matchesCategory = !category || item.category === category
      const matchesSearch =
        !query ||
        normalizeSearchText(item.name).includes(query) ||
        normalizeSearchText(item.code).includes(query) ||
        item.asset_codes.some((code) => normalizeSearchText(code).includes(query)) ||
        normalizeSearchText(item.category).includes(query)

      return matchesCategory && matchesSearch
    })
  }, [category, items, search])

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

  return (
    <div className="rounded-lg bg-white p-4 shadow sm:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Catálogo disponible</h2>
          <p className="text-sm text-slate-500">
            Resultados: {filteredItems.length} de {items.length} ítems
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(220px,320px)_minmax(180px,240px)]">
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Buscar por nombre, código interno, código patrimonial o categoría"
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageItems.length > 0 ? (
          pageItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-slate-500">Código: {item.code}</p>
              <p className="text-sm">Stock: {item.stock_available}</p>
              <p className="text-sm text-slate-500">
                Categoría: {item.category || 'Sin categoría'}
              </p>
              <p className="text-sm text-slate-500">Tipo: {item.item_type || '-'}</p>
            </div>
          ))
        ) : (
          <p className="text-slate-500">No hay ítems que coincidan con el filtro.</p>
        )}
      </div>

      {filteredItems.length > PAGE_SIZE && (
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
