'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { formatAssetCodes, normalizeSearchText } from '@/lib/item-format'
import {
  formatUnitAvailability,
  formatUnitCondition,
  unitAvailabilityBadgeClass,
  unitConditionBadgeClass,
} from '@/lib/status-format'
import { useConfirmSubmit } from '@/components/confirm-submit'
import { createMaintenanceWithState } from './actions'
import { ItemAddedToast } from '@/components/item-added-toast'

type MaintenanceItem = {
  id: string
  name: string
  code: string
  category: string | null
  asset_codes: string[]
  units: Array<{
    id: string
    asset_code: string | null
    serial_code: string | null
    condition: string
    availability_status: string
  }>
}

const RESULTS_LIMIT = 12

export function MaintenanceForm({ items }: { items: MaintenanceItem[] }) {
  const [state, formAction, isPending] = useActionState(
    createMaintenanceWithState,
    { error: null }
  )
  const [selectedItemId, setSelectedItemId] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [markUnitUnavailable, setMarkUnitUnavailable] = useState(false)
  const [maintenanceType, setMaintenanceType] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [addedItemName, setAddedItemName] = useState('')
  const confirmSubmit = useConfirmSubmit({
    title: 'Registrar mantenimiento',
    message: 'Confirma que deseas registrar este mantenimiento.',
    confirmLabel: 'Registrar',
  })

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
      const matchesSearch =
        !query ||
        normalizeSearchText(item.name).includes(query) ||
        normalizeSearchText(item.code).includes(query) ||
        item.asset_codes.some((code) => normalizeSearchText(code).includes(query)) ||
        normalizeSearchText(item.category).includes(query)
      return matchesCategory && matchesSearch
    })
  }, [category, items, search])

  const visibleItems = filteredItems.slice(0, RESULTS_LIMIT)
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const selectedUnits = selectedItem?.units ?? []
  const selectedUnit = selectedUnits.find((unit) => unit.id === selectedUnitId)
  const isGeneralMaintenance = selectedItemId === 'general'

  useEffect(() => {
    if (!addedItemName) return

    const timeout = window.setTimeout(() => setAddedItemName(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [addedItemName])

  function selectItem(itemId: string) {
    setSelectedItemId(itemId)
    setSelectedUnitId('')
    setMarkUnitUnavailable(false)
    setMaintenanceType((currentType) => {
      if (itemId === 'general') return 'general'
      return currentType === 'general' ? '' : currentType
    })
    setAddedItemName(
      itemId === 'general'
        ? 'Trabajo general'
        : items.find((item) => item.id === itemId)?.name ?? 'Ítem'
    )
    setSearch('')
  }

  function clearSelection() {
    setSelectedItemId('')
    setSelectedUnitId('')
    setMarkUnitUnavailable(false)
    setMaintenanceType('')
  }

  function clearFilters() {
    setSearch('')
    setCategory('')
  }

  const hasItemFilters = Boolean(search || category)

  return (
    <form
      action={formAction}
      className="grid gap-4 md:grid-cols-2"
      onSubmit={confirmSubmit.onSubmit}
    >
      {confirmSubmit.dialog}
      <ItemAddedToast itemName={addedItemName} />

      <div className="space-y-4 md:col-span-2">
        <input type="hidden" name="item_id" value={selectedItemId} />
        <input type="hidden" name="item_unit_id" value={selectedUnitId} />

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
                      </span>
                      <span className="mt-2 flex flex-wrap gap-2 text-xs">
                        {assetCodes && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 ring-1 ring-blue-200">
                            Patrimonial: {assetCodes}
                          </span>
                        )}
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                          {item.category || 'Sin categoría'}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-lg bg-white px-3 py-4 text-center text-sm text-slate-500">
                No hay equipos que coincidan con la búsqueda o filtros.
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
                <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                  <p className="font-medium text-slate-900">{selectedItem.name}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Código interno: {selectedItem.code}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {formatAssetCodes(selectedItem.asset_codes) && (
                      <span className="rounded-full bg-white px-2.5 py-1 font-medium text-blue-700 ring-1 ring-blue-200">
                        Patrimonial: {formatAssetCodes(selectedItem.asset_codes)}
                      </span>
                    )}
                    <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                      {selectedItem.category || 'Sin categoría'}
                    </span>
                  </div>
                </div>
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

        {selectedItem && selectedUnits.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-slate-800">Unidad específica</p>
              <p className="text-sm text-slate-500">
                Opcional: selecciona una unidad patrimonial para asociarla al mantenimiento.
              </p>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {selectedUnits.map((unit) => {
                const selected = selectedUnitId === unit.id
                const isLoaned = unit.availability_status === 'loaned'
                const label = unit.asset_code || unit.serial_code || 'Unidad sin código'

                return (
                  <button
                    key={unit.id}
                    type="button"
                    disabled={isLoaned}
                    onClick={() => {
                      setSelectedUnitId(selected ? '' : unit.id)
                      setMarkUnitUnavailable(false)
                    }}
                    className={
                      'rounded-lg border p-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ' +
                      (selected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50')
                    }
                  >
                    <span className="block font-medium text-slate-900">{label}</span>
                    {unit.asset_code && unit.serial_code && (
                      <span className="mt-1 block text-xs text-slate-500">
                        Serie: {unit.serial_code}
                      </span>
                    )}
                    <span className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span
                        className={
                          'rounded-full px-2.5 py-1 font-medium ring-1 ' +
                          unitConditionBadgeClass(unit.condition)
                        }
                      >
                        {formatUnitCondition(unit.condition)}
                      </span>
                      <span
                        className={
                          'rounded-full px-2.5 py-1 font-medium ring-1 ' +
                          unitAvailabilityBadgeClass(unit.availability_status)
                        }
                      >
                        {formatUnitAvailability(unit.availability_status)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            {selectedUnit && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <label className="flex items-start gap-3 text-sm text-amber-900">
                  <input
                    type="checkbox"
                    name="mark_unit_unavailable"
                    checked={markUnitUnavailable}
                    onChange={(event) => setMarkUnitUnavailable(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-500"
                  />
                  <span>
                    <span className="block font-medium">Marcar unidad como en mantenimiento / no disponible</span>
                    <span className="mt-1 block text-amber-800">
                      Si no activas esta opción, solo se guardará el reporte como evidencia y la unidad conservará su estado actual.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </div>
        )}
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

      <select
        name="maintenance_type"
        required
        value={maintenanceType}
        onChange={(event) => setMaintenanceType(event.target.value)}
        className="rounded border p-2"
      >
        <option value="">Tipo</option>
        {!isGeneralMaintenance && <option value="preventive">Preventivo</option>}
        {!isGeneralMaintenance && <option value="corrective">Correctivo</option>}
        {isGeneralMaintenance && <option value="general">Trabajo general</option>}
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
