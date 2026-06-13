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
    <div className="mt-8 overflow-hidden rounded-lg bg-white shadow">
      <div className="space-y-4 border-b p-4 sm:p-6">
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

      <div className="divide-y md:hidden">
        {pageUnits.length > 0 ? (
          pageUnits.map((unit) => (
            <div key={unit.id} className="space-y-2 p-4 text-sm">
              <div>
                <p className="font-medium">{unit.item_name}</p>
                <p className="text-slate-500">{unit.item_code}</p>
              </div>
              <p><span className="font-medium">Patrimonial:</span> {unit.asset_code || '-'}</p>
              <p><span className="font-medium">Serie:</span> {unit.serial_code || '-'}</p>
              <p><span className="font-medium">Marca / modelo:</span> {[unit.brand, unit.model].filter(Boolean).join(' / ') || '-'}</p>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                <p><span className="block text-xs text-slate-500">Condición</span>{formatCondition(unit.condition)}</p>
                <p><span className="block text-xs text-slate-500">Disponibilidad</span>{formatAvailability(unit.availability_status)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="p-6 text-center text-slate-500">No hay unidades que coincidan con los filtros.</p>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[1240px] text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Equipo</th>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Patrimonial</th>
              <th className="px-4 py-3 text-left">Código anterior</th>
              <th className="px-4 py-3 text-left">Serie</th>
              <th className="px-4 py-3 text-left">Marca</th>
              <th className="px-4 py-3 text-left">Modelo</th>
              <th className="px-4 py-3 text-left">Condición</th>
              <th className="px-4 py-3 text-left">Disponibilidad</th>
              <th className="px-4 py-3 text-left">Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {pageUnits.length > 0 ? (
              pageUnits.map((unit) => (
                <tr key={unit.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">{unit.item_name}</td>
                  <td className="px-4 py-3">{unit.item_code}</td>
                  <td className="px-4 py-3">{unit.asset_code || '-'}</td>
                  <td className="px-4 py-3">{unit.old_code || '-'}</td>
                  <td className="px-4 py-3">{unit.serial_code || '-'}</td>
                  <td className="px-4 py-3">{unit.brand || '-'}</td>
                  <td className="px-4 py-3">{unit.model || '-'}</td>
                  <td className="px-4 py-3">{formatCondition(unit.condition)}</td>
                  <td className="px-4 py-3">{formatAvailability(unit.availability_status)}</td>
                  <td className="px-4 py-3">{unit.entry_date || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                  No hay unidades que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredUnits.length > PAGE_SIZE && (
        <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
    </div>
  )
}
