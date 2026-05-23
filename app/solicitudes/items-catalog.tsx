'use client'

import { useMemo, useState } from 'react'

type CatalogItem = {
  id: string
  name: string
  code: string
  stock_available: number
  item_type: string | null
  category: string | null
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function ItemsCatalog({ items }: { items: CatalogItem[] }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

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
    const query = normalize(search)

    return items.filter((item) => {
      const matchesCategory = !category || item.category === category
      const matchesSearch =
        !query ||
        normalize(item.name).includes(query) ||
        normalize(item.code).includes(query) ||
        normalize(item.category).includes(query)

      return matchesCategory && matchesSearch
    })
  }, [category, items, search])

  return (
    <div className="bg-white rounded-2xl shadow p-6">
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
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, código o categoría"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
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
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div key={item.id} className="border rounded-xl p-4">
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
    </div>
  )
}
