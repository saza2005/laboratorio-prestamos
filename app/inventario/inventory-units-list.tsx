'use client'

import { useMemo, useState } from 'react'
import { normalizeSearchText } from '@/lib/item-format'
import { DetailDrawer } from '@/components/detail-drawer'
import { PaginationControls } from '@/components/pagination-controls'
import {
  formatUnitAvailability,
  formatUnitCondition,
  unitAvailabilityBadgeClass,
  unitConditionBadgeClass,
} from '@/lib/status-format'

type InventoryUnit = {
  id: string
  asset_code: string | null
  old_code: string | null
  serial_code: string | null
  model: string | null
  brand: string | null
  condition: string
  availability_status: string
  entry_date: string | null
  assignment_date: string | null
  item_name: string
  item_code: string
}

const PAGE_SIZE = 50

export function InventoryUnitsList({ units }: { units: InventoryUnit[] }) {
  const [search, setSearch] = useState('')
  const [condition, setCondition] = useState('')
  const [availability, setAvailability] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  const filteredUnits = useMemo(() => {
    const query = normalizeSearchText(search)

    return units.filter((unit) => {
      const matchesSearch =
        !query ||
        normalizeSearchText(unit.item_name).includes(query) ||
        normalizeSearchText(unit.item_code).includes(query) ||
        normalizeSearchText(unit.asset_code).includes(query) ||
        normalizeSearchText(unit.old_code).includes(query) ||
        normalizeSearchText(unit.serial_code).includes(query) ||
        normalizeSearchText(unit.model).includes(query) ||
        normalizeSearchText(unit.brand).includes(query)
      const matchesCondition = !condition || unit.condition === condition
      const matchesAvailability =
        !availability || unit.availability_status === availability

      return matchesSearch && matchesCondition && matchesAvailability
    })
  }, [availability, condition, search, units])

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageUnits = filteredUnits.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
  const selectedUnit = selectedUnitId
    ? filteredUnits.find((unit) => unit.id === selectedUnitId) ?? null
    : null

  function resetPage() {
    setPage(1)
    setSelectedUnitId(null)
  }

  function clearFilters() {
    setSearch('')
    setCondition('')
    setAvailability('')
    setPage(1)
    setSelectedUnitId(null)
  }

  const hasFilters = Boolean(search || condition || availability)

  return (
    <section className="mt-8 rounded-2xl bg-white p-4 shadow sm:p-6">
      <div className="mb-4 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Unidades individuales</h2>
          <p className="mt-1 text-sm text-slate-500">
            Resultados: {filteredUnits.length} de {units.length}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              resetPage()
            }}
            placeholder="Buscar por equipo, código, serie, marca o modelo"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={condition}
            onChange={(event) => {
              setCondition(event.target.value)
              resetPage()
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas las condiciones</option>
            <option value="good">Bueno</option>
            <option value="damaged">Dañado</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="retired">Retirado</option>
          </select>

          <select
            value={availability}
            onChange={(event) => {
              setAvailability(event.target.value)
              resetPage()
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Toda disponibilidad</option>
            <option value="available">Disponible</option>
            <option value="loaned">Prestado</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="unavailable">No disponible</option>
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

      {pageUnits.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[minmax(0,1.2fr)_132px_132px_minmax(0,1fr)_118px_132px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Equipo</span>
              <span>Patrimonial</span>
              <span>Serie</span>
              <span>Marca / modelo</span>
              <span>Condición</span>
              <span>Disponibilidad</span>
            </div>

            <div className="divide-y divide-slate-200">
              {pageUnits.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[minmax(0,1.2fr)_132px_132px_minmax(0,1fr)_118px_132px] md:items-center md:gap-3 ${
                    selectedUnit?.id === unit.id ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedUnitId(unit.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">{unit.item_name}</span>
                    <span className="block truncate text-xs text-slate-500">{unit.item_code}</span>
                  </span>
                  <span className="truncate text-slate-700">{unit.asset_code || '-'}</span>
                  <span className="truncate text-slate-700">{unit.serial_code || '-'}</span>
                  <span className="truncate text-slate-600">
                    {[unit.brand, unit.model].filter(Boolean).join(' / ') || '-'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${unitConditionBadgeClass(
                      unit.condition
                    )}`}
                  >
                    {formatUnitCondition(unit.condition)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ring-1 ${unitAvailabilityBadgeClass(
                      unit.availability_status
                    )}`}
                  >
                    {formatUnitAvailability(unit.availability_status)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <DetailDrawer isOpen={Boolean(selectedUnit)} onClose={() => setSelectedUnitId(null)}>
            {selectedUnit && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{selectedUnit.item_code}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {selectedUnit.item_name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {[selectedUnit.brand, selectedUnit.model].filter(Boolean).join(' / ') || '-'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUnitId(null)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Condición</span>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${unitConditionBadgeClass(
                        selectedUnit.condition
                      )}`}
                    >
                      {formatUnitCondition(selectedUnit.condition)}
                    </span>
                  </p>
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Disponibilidad</span>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${unitAvailabilityBadgeClass(
                        selectedUnit.availability_status
                      )}`}
                    >
                      {formatUnitAvailability(selectedUnit.availability_status)}
                    </span>
                  </p>
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Patrimonial</span>
                    <span className="font-semibold">{selectedUnit.asset_code || '-'}</span>
                  </p>
                  <p className="rounded-lg bg-slate-50 px-3 py-3">
                    <span className="block text-xs text-slate-500">Serie</span>
                    <span className="font-semibold">{selectedUnit.serial_code || '-'}</span>
                  </p>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <p><span className="font-medium text-slate-700">Código anterior:</span> {selectedUnit.old_code || '-'}</p>
                  <p><span className="font-medium text-slate-700">Marca:</span> {selectedUnit.brand || '-'}</p>
                  <p><span className="font-medium text-slate-700">Modelo:</span> {selectedUnit.model || '-'}</p>
                  <p><span className="font-medium text-slate-700">Ingreso:</span> {selectedUnit.entry_date || '-'}</p>
                  <p><span className="font-medium text-slate-700">Asignación:</span> {selectedUnit.assignment_date || '-'}</p>
                </div>
              </div>
            )}
          </DetailDrawer>
        </>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay unidades que coincidan con los filtros.
        </p>
      )}

      {filteredUnits.length > PAGE_SIZE && (
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
