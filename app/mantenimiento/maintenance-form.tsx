'use client'

import { useActionState, useMemo, useState } from 'react'
import { createMaintenanceWithState } from './actions'

type MaintenanceItem = {
  id: string
  name: string
  code: string
  category: string | null
  asset_codes: string[]
}

const SELECT_OPTIONS_LIMIT = 100

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase('es') ?? ''
}

export function MaintenanceForm({ items }: { items: MaintenanceItem[] }) {
  const [state, formAction, isPending] = useActionState(
    createMaintenanceWithState,
    { error: null }
  )
  const [selectedItemId, setSelectedItemId] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

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
      const matchesSearch =
        !query ||
        normalize(item.name).includes(query) ||
        normalize(item.code).includes(query) ||
        item.asset_codes.some((code) => normalize(code).includes(query)) ||
        normalize(item.category).includes(query)
      return matchesCategory && matchesSearch
    })
  }, [category, items, search])

  const visibleItems = filteredItems.slice(0, SELECT_OPTIONS_LIMIT)
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const selectableItems =
    selectedItem && !visibleItems.some((item) => item.id === selectedItem.id)
      ? [selectedItem, ...visibleItems]
      : visibleItems

  return (
    <form
      action={formAction}
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        if (!confirm('¿Seguro que deseas registrar este mantenimiento?')) {
          event.preventDefault()
        }
      }}
    >
      <div className="space-y-2">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar equipo por nombre, código interno, código patrimonial o categoría"
          className="w-full rounded border p-2 text-sm"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded border p-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <select
          name="item_id"
          required
          value={selectedItemId}
          onChange={(event) => setSelectedItemId(event.target.value)}
          disabled={isPending}
          className="w-full rounded border p-2 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="">Seleccione equipo o trabajo general</option>
          <option value="general">Trabajo general</option>
          {selectableItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} [{item.code}]
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          Coincidencias: {filteredItems.length} de {items.length}.
          {filteredItems.length > SELECT_OPTIONS_LIMIT
            ? ` Mostrando las primeras ${SELECT_OPTIONS_LIMIT}; afine la búsqueda.`
            : ''}
        </p>
      </div>

      <input
        name="activity"
        placeholder="Actividad realizada"
        required
        className="border p-2 rounded"
      />

      <input
        name="responsible"
        placeholder="Responsable(s)"
        required
        className="border p-2 rounded"
      />

      <input
        name="maintenance_date"
        type="date"
        required
        className="border p-2 rounded"
      />

      <select name="maintenance_type" required className="border p-2 rounded">
        <option value="">Tipo</option>
        <option value="preventive">Preventivo</option>
        <option value="corrective">Correctivo</option>
      </select>

      <textarea
        name="observations"
        placeholder="Observaciones"
        className="border p-2 rounded md:col-span-2"
      />

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isPending ? 'Guardando...' : 'Guardar'}
        </button>

        {items.length === 0 && (
          <p className="mt-2 text-sm text-amber-700">
            No hay equipos disponibles. Puede registrar un trabajo general.
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
