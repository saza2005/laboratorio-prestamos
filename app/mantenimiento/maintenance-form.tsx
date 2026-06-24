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

const RESULTS_LIMIT = 12

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase('es') ?? ''
}

function formatAssetCodes(codes: string[]) {
  if (codes.length === 0) return null
  if (codes.length <= 2) return codes.join(', ')
  return `${codes.slice(0, 2).join(', ')} +${codes.length - 2}`
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

  const visibleItems = filteredItems.slice(0, RESULTS_LIMIT)
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const isGeneralMaintenance = selectedItemId === 'general'

  function selectItem(itemId: string) {
    setSelectedItemId(itemId)
    setSearch('')
  }

  function clearSelection() {
    setSelectedItemId('')
  }

  function clearFilters() {
    setSearch('')
    setCategory('')
  }

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
      <div className="space-y-4 md:col-span-2">
        <input type="hidden" name="item_id" value={selectedItemId} />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Equipo o trabajo general</p>
              <p className="text-sm text-slate-500">
                Selecciona un equipo o registra un trabajo general.
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectItem('general')}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                isGeneralMaintenance
                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                  : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              Trabajo general
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)_auto]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar equipo por nombre, código interno, código patrimonial o categoría"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas las categorías</option>
              {categories.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm transition hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Coincidencias: {filteredItems.length} de {items.length}.
            {filteredItems.length > RESULTS_LIMIT
              ? ` Mostrando ${RESULTS_LIMIT}; afine la búsqueda.`
              : ''}
          </p>

          <div className="mt-3">
            {visibleItems.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {visibleItems.map((item) => {
                  const assetCodes = formatAssetCodes(item.asset_codes)
                  const selected = selectedItemId === item.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectItem(item.id)}
                      className={`rounded-lg border p-3 text-left transition ${
                        selected
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <span className="block font-medium text-slate-900">
                        {item.name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Código interno: {item.code}
                        {assetCodes ? ` | Patrimonial: ${assetCodes}` : ''}
                      </span>
                      <span className="mt-1 block text-xs text-slate-600">
                        Categoría: {item.category || 'Sin categoría'}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-lg bg-white px-3 py-4 text-center text-sm text-slate-500">
                No hay equipos que coincidan con la búsqueda.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Selección actual</p>
              {isGeneralMaintenance ? (
                <p className="text-sm text-slate-600">Trabajo general</p>
              ) : selectedItem ? (
                <p className="text-sm text-slate-600">
                  {selectedItem.name} [{selectedItem.code}]
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Aún no has seleccionado equipo o trabajo general.
                </p>
              )}
            </div>
            {selectedItemId && (
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 transition hover:bg-red-100"
              >
                Quitar selección
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        name="activity"
        placeholder="Actividad realizada"
        required
        className="rounded border p-2"
      />

      <input
        name="responsible"
        placeholder="Responsable(s)"
        required
        className="rounded border p-2"
      />

      <input
        name="maintenance_date"
        type="date"
        required
        className="rounded border p-2"
      />

      <select name="maintenance_type" required className="rounded border p-2">
        <option value="">Tipo</option>
        <option value="preventive">Preventivo</option>
        <option value="corrective">Correctivo</option>
      </select>

      <textarea
        name="observations"
        placeholder="Observaciones"
        className="rounded border p-2 md:col-span-2"
      />

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isPending || !selectedItemId}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isPending ? 'Guardando...' : 'Guardar'}
        </button>

        {!selectedItemId && (
          <p className="mt-2 text-sm text-slate-500">
            Selecciona un equipo o trabajo general antes de guardar.
          </p>
        )}

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
