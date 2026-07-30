'use client'

import { useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import {
  formatMaintenanceType,
  formatUnitAvailability,
  formatUnitCondition,
  maintenanceTypeBadgeClass as typeBadgeClass,
  unitAvailabilityBadgeClass,
  unitConditionBadgeClass,
} from '@/lib/status-format'
import { normalizeSearchText } from '@/lib/item-format'

type MaintenanceRecord = {
  id: string
  activity: string
  responsible: string
  maintenance_date: string
  maintenance_type: string
  observations: string | null
  item: {
    name?: string
    code?: string
  } | null
  unit: {
    asset_code?: string | null
    serial_code?: string | null
    condition?: string | null
    availability_status?: string | null
  } | null
}

type MaintenanceHistoryProps = {
  records: MaintenanceRecord[]
  limit?: number
}

function getItemName(record: MaintenanceRecord) {
  return record.item?.name ?? 'Trabajo general'
}

function getItemCode(record: MaintenanceRecord) {
  return record.item?.code ?? '-'
}

function getUnitLabel(record: MaintenanceRecord) {
  if (!record.unit) return ""
  return record.unit.asset_code || record.unit.serial_code || "Unidad sin código"
}

export function MaintenanceHistory({ records, limit }: MaintenanceHistoryProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [unitStateFilter, setUnitStateFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filteredRecords = useMemo(() => {
    const term = normalizeSearchText(search)

    return records.filter((record) => {
      const matchesType = typeFilter ? record.maintenance_type === typeFilter : true
      const matchesUnitState =
        !unitStateFilter ||
        (unitStateFilter === "with-unit"
          ? Boolean(record.unit)
          : unitStateFilter === "no-unit"
            ? !record.unit
            : unitStateFilter === "maintenance"
              ? record.unit?.condition === "maintenance"
              : unitStateFilter === "unavailable"
                ? record.unit?.availability_status === "unavailable"
                : true)
      const itemName = normalizeSearchText(getItemName(record))
      const itemCode = normalizeSearchText(getItemCode(record))
      const activity = normalizeSearchText(record.activity)
      const responsible = normalizeSearchText(record.responsible)
      const observations = normalizeSearchText(record.observations)
      const date = normalizeSearchText(record.maintenance_date)
      const unitLabel = normalizeSearchText(getUnitLabel(record))

      const matchesSearch =
        !term ||
        itemName.includes(term) ||
        itemCode.includes(term) ||
        activity.includes(term) ||
        responsible.includes(term) ||
        observations.includes(term) ||
        date.includes(term) ||
        unitLabel.includes(term)

      return matchesType && matchesUnitState && matchesSearch
    })
  }, [records, search, typeFilter, unitStateFilter])

  const selectedRecord = selectedId
    ? filteredRecords.find((record) => record.id === selectedId) ?? null
    : null

  function openRecord(recordId: string) {
    setSelectedId(recordId)
  }

  function closeRecord() {
    setSelectedId(null)
  }

  function clearFilters() {
    setSearch('')
    setTypeFilter('')
    setUnitStateFilter('')
    setSelectedId(null)
  }

  const hasFilters = Boolean(search || typeFilter || unitStateFilter)

  return (
    <section className="rounded-2xl bg-white p-4 shadow sm:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Historial</h2>
          <p className="text-sm text-slate-500">
            Resultados: {filteredRecords.length}
            {limit ? ` de los últimos ${limit} mantenimientos` : ''}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_200px_auto]">
          <input
            type="text"
            placeholder="Buscar por equipo, código, actividad, responsable o fecha"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los tipos</option>
            <option value="preventive">Preventivo</option>
            <option value="corrective">Correctivo</option>
          </select>
          <select
            value={unitStateFilter}
            onChange={(event) => setUnitStateFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas las unidades</option>
            <option value="with-unit">Con unidad asociada</option>
            <option value="no-unit">Sin unidad asociada</option>
            <option value="maintenance">En mantenimiento</option>
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

      {filteredRecords.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_112px_118px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Equipo</span>
              <span>Actividad</span>
              <span>Responsable</span>
              <span>Fecha</span>
              <span>Tipo</span>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredRecords.map((record) => {
                const selected = selectedRecord?.id === record.id

                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => openRecord(record.id)}
                    className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_112px_118px] md:items-center md:gap-3 ${
                      selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {getItemName(record)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {getItemCode(record)}
                        {getUnitLabel(record) ? " · " + getUnitLabel(record) : ""}
                      </span>
                    </span>
                    <span className="truncate text-slate-700">{record.activity}</span>
                    <span className="truncate text-slate-600">{record.responsible}</span>
                    <span className="text-slate-500">{record.maintenance_date}</span>
                    <span>
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${typeBadgeClass(
                          record.maintenance_type
                        )}`}
                      >
                        {formatMaintenanceType(record.maintenance_type)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <DetailDrawer isOpen={Boolean(selectedRecord)} onClose={closeRecord}>
            {selectedRecord && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{selectedRecord.maintenance_date}</p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {getItemName(selectedRecord)}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Código: {getItemCode(selectedRecord)}
                    </p>
                    {getUnitLabel(selectedRecord) && (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-slate-500">
                          Unidad: {getUnitLabel(selectedRecord)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedRecord.unit?.condition && (
                            <span
                              className={
                                "rounded-full px-2.5 py-1 text-xs font-medium ring-1 " +
                                unitConditionBadgeClass(selectedRecord.unit.condition)
                              }
                            >
                              {formatUnitCondition(selectedRecord.unit.condition)}
                            </span>
                          )}
                          {selectedRecord.unit?.availability_status && (
                            <span
                              className={
                                "rounded-full px-2.5 py-1 text-xs font-medium ring-1 " +
                                unitAvailabilityBadgeClass(selectedRecord.unit.availability_status)
                              }
                            >
                              {formatUnitAvailability(selectedRecord.unit.availability_status)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${typeBadgeClass(
                        selectedRecord.maintenance_type
                      )}`}
                    >
                      {formatMaintenanceType(selectedRecord.maintenance_type)}
                    </span>
                    <button
                      type="button"
                      onClick={closeRecord}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-slate-700">Actividad</p>
                    <p className="mt-1 text-slate-600">{selectedRecord.activity}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Responsable</p>
                    <p className="mt-1 text-slate-600">{selectedRecord.responsible}</p>
                  </div>
                </div>

                {selectedRecord.observations && (
                  <div className="border-t border-slate-200 pt-4">
                    <p className="font-medium text-slate-700">Observaciones</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedRecord.observations}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DetailDrawer>
        </>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay mantenimientos que coincidan con los filtros.
        </p>
      )}
    </section>
  )
}
