'use client'

import { useMemo, useState } from 'react'

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
}

type MaintenanceHistoryProps = {
  records: MaintenanceRecord[]
  limit?: number
}

function formatMaintenanceType(type: string) {
  switch (type) {
    case 'preventive':
      return 'Preventivo'
    case 'corrective':
      return 'Correctivo'
    default:
      return type
  }
}

function typeBadgeClass(type: string) {
  switch (type) {
    case 'preventive':
      return 'bg-blue-100 text-blue-700'
    case 'corrective':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function getItemName(record: MaintenanceRecord) {
  return record.item?.name ?? 'Trabajo general'
}

function getItemCode(record: MaintenanceRecord) {
  return record.item?.code ?? '-'
}

export function MaintenanceHistory({ records, limit }: MaintenanceHistoryProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedId, setSelectedId] = useState(records[0]?.id ?? '')

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase()

    return records.filter((record) => {
      const matchesType = typeFilter ? record.maintenance_type === typeFilter : true
      const itemName = getItemName(record).toLowerCase()
      const itemCode = getItemCode(record).toLowerCase()
      const activity = record.activity.toLowerCase()
      const responsible = record.responsible.toLowerCase()
      const observations = record.observations?.toLowerCase() ?? ''
      const date = record.maintenance_date.toLowerCase()

      const matchesSearch =
        !term ||
        itemName.includes(term) ||
        itemCode.includes(term) ||
        activity.includes(term) ||
        responsible.includes(term) ||
        observations.includes(term) ||
        date.includes(term)

      return matchesType && matchesSearch
    })
  }, [records, search, typeFilter])

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ??
    filteredRecords[0] ??
    null

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

        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px]">
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
        </div>
      </div>

      {filteredRecords.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
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
                    onClick={() => setSelectedId(record.id)}
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

          <aside className="rounded-lg border border-slate-200 bg-white p-4 xl:sticky xl:top-4 xl:self-start">
            {selectedRecord ? (
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
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${typeBadgeClass(
                      selectedRecord.maintenance_type
                    )}`}
                  >
                    {formatMaintenanceType(selectedRecord.maintenance_type)}
                  </span>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
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
            ) : null}
          </aside>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay mantenimientos que coincidan con los filtros.
        </p>
      )}
    </section>
  )
}
