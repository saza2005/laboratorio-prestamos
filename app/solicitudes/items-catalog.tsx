'use client'

import { useMemo, useState } from 'react'
import { normalizeSearchText } from '@/lib/item-format'
import { PaginationControls } from '@/components/pagination-controls'
import { formatItemType, itemTypeBadgeClass, stockAvailabilityBadgeClass } from '@/lib/status-format'
import { AppIcon } from '@/components/app-icon'

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

  function clearFilters() {
    setSearch('')
    setCategory('')
    setPage(1)
  }

  const hasFilters = Boolean(search || category)

  return (
    <section className="surface-card p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Catálogo disponible</h2>
          <p className="text-sm text-slate-500">
            Resultados: {filteredItems.length} de {items.length} ítems
          </p>
        </div>

        <div className="search-toolbar md:grid-cols-[minmax(220px,320px)_minmax(180px,240px)_auto]">
          <label className="min-w-0">
            <span className="form-label">Buscar material</span>
            <span className="relative block">
              <AppIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Nombre, código o categoría" className="form-control pl-9 text-sm" />
            </span>
          </label>

          <label>
            <span className="form-label">Categoría</span>
            <select value={category} onChange={(event) => updateCategory(event.target.value)} className="form-control text-sm">
              <option value="">Todas las categorías</option>
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="button-quiet self-end"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageItems.length > 0 ? (
          pageItems.map((item) => (
            <article key={item.id} className="material-card">
              <div className="flex items-start gap-3">
                <span className="module-card-icon h-10 w-10"><AppIcon name="boxes" className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h3 className="line-clamp-2 font-semibold leading-5" title={item.name}>{item.name}</h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">Código: {item.code}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${stockAvailabilityBadgeClass(
                    item.stock_available
                  )}`}
                >
                  Stock: {item.stock_available}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${itemTypeBadgeClass(
                    item.item_type
                  )}`}
                >
                  {formatItemType(item.item_type)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Categoría: {item.category || 'Sin categoría'}
              </p>
              {item.asset_codes.length > 0 && <p className="mt-1 truncate text-xs text-slate-500" title={item.asset_codes.join(', ')}>Patrimonial: {item.asset_codes.join(', ')}</p>}
            </article>
          ))
        ) : (
          <p className="text-slate-500">No hay ítems que coincidan con la búsqueda o filtros.</p>
        )}
      </div>

      {filteredItems.length > PAGE_SIZE && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setPage((value) => Math.max(1, value - 1))}
          onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
          className="mt-5"
        />
      )}
    </section>
  )
}
