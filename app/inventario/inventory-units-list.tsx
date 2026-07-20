'use client'

import { useMemo, useState } from 'react'

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

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase('es') ?? ''
}

function formatCondition(value: string) {
  switch (value) {
    case 'good':
      return 'Bueno'
    case 'damaged':
      return 'Dañado'
    case 'maintenance':
      return 'Mantenimiento'
    case 'retired':
      return 'Retirado'
    default:
      return value
  }
}

function formatAvailability(value: string) {
  switch (value) {
    case 'available':
      return 'Disponible'
    case 'loaned':
      return 'Prestado'
    case 'maintenance':
      return 'Mantenimiento'
    case 'unavailable':
      return 'No disponible'
    default:
      return value
  }
}

export function InventoryUnitsList({ units }: { units: InventoryUnit[] }) {
  const [search, setSearch] = useState('')
  const [condition, setCondition] = useState('')
  const [availability, setAvailability] = useState('')
  const [page, setPage] = useState(1)

  const filteredUnits = useMemo(() => {
    const query = normalize(search)

    return units.filter((unit) => {
      const matchesSearch =
        !query ||
        normalize(unit.item_name).includes(query) ||
        normalize(unit.item_code).includes(query) ||
        normalize(unit.asset_code).includes(query) ||
        normalize(unit.old_code).includes(query) ||
        normalize(unit.serial_code).includes(query) ||
        normalize(unit.model).includes(query) ||
        normalize(unit.brand).includes(query)
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

  function resetPage() {
    setPage(1)
  }

  return (
    <section className="mt-8 rounded-2xl bg-white p-4 shadow sm:p-6">
      <div className="mb-4 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Unidades individuales</h2>
          <p className="mt-1 text-sm text-slate-500">
            Resultados: {filteredUnits.length} de {units.length}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px]">
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
        </div>
      </div>

      {pageUnits.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
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
                  className="grid w-full gap-2 bg-white px-4 py-3 text-left text-sm transition hover:bg-slate-50 md:grid-cols-[minmax(0,1.2fr)_132px_132px_minmax(0,1fr)_118px_132px] md:items-center md:gap-3"
                  onClick={() => {
                    const element = document.getElementById(`unit-detail-${unit.id}`)
                    element?.scrollIntoView({ block: 'nearest' })
                  }}
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
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {formatCondition(unit.condition)}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    {formatAvailability(unit.availability_status)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 xl:sticky xl:top-4 xl:self-start">
            <p className="mb-3 text-sm font-medium text-slate-700">Detalle de unidad</p>
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {pageUnits.map((unit) => (
                <div
                  key={unit.id}
                  id={`unit-detail-${unit.id}`}
                  className="rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{unit.item_name}</p>
                    <p className="text-xs text-slate-500">{unit.item_code}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <p className="rounded bg-white px-2 py-2"><span className="block text-xs text-slate-500">Condición</span>{formatCondition(unit.condition)}</p>
                    <p className="rounded bg-white px-2 py-2"><span className="block text-xs text-slate-500">Disponibilidad</span>{formatAvailability(unit.availability_status)}</p>
                  </div>
                  <div className="mt-3 space-y-1 text-slate-600">
                    <p><span className="font-medium text-slate-700">Patrimonial:</span> {unit.asset_code || '-'}</p>
                    <p><span className="font-medium text-slate-700">Código anterior:</span> {unit.old_code || '-'}</p>
                    <p><span className="font-medium text-slate-700">Serie:</span> {unit.serial_code || '-'}</p>
                    <p><span className="font-medium text-slate-700">Marca:</span> {unit.brand || '-'}</p>
                    <p><span className="font-medium text-slate-700">Modelo:</span> {unit.model || '-'}</p>
                    <p><span className="font-medium text-slate-700">Ingreso:</span> {unit.entry_date || '-'}</p>
                    <p><span className="font-medium text-slate-700">Asignación:</span> {unit.assignment_date || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay unidades que coincidan con los filtros.
        </p>
      )}

      {filteredUnits.length > PAGE_SIZE && (
        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Página {currentPage} de {totalPages}</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
