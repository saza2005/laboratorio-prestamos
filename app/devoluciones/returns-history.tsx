'use client'

import { useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import { formatDateTime } from '@/lib/format-date'
import { normalizeSearchText } from '@/lib/item-format'

type ReturnHistoryEntry = {
  id: string
  quantity_ok: number
  quantity_damaged: number
  quantity_missing: number
  notes: string | null
  created_at: string | null
  item_name: string
  item_code: string
  unit_code: string | null
  borrower_name: string
  receiver_name: string
}

type ReturnsHistoryProps = {
  entries: ReturnHistoryEntry[]
  limit?: number
}

function getTotal(entry: ReturnHistoryEntry) {
  return entry.quantity_ok + entry.quantity_damaged + entry.quantity_missing
}

function getResultLabel(entry: ReturnHistoryEntry) {
  const labels = []
  if (entry.quantity_ok > 0) labels.push(`OK: ${entry.quantity_ok}`)
  if (entry.quantity_damaged > 0) labels.push(`Dañado: ${entry.quantity_damaged}`)
  if (entry.quantity_missing > 0) labels.push(`Faltante: ${entry.quantity_missing}`)

  return labels.length > 0 ? labels.join(' | ') : 'Sin cantidades'
}

export function ReturnsHistory({ entries, limit }: ReturnsHistoryProps) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filteredEntries = useMemo(() => {
    const term = normalizeSearchText(search)

    if (!term) return entries

    return entries.filter((entry) => {
      return (
        normalizeSearchText(entry.borrower_name).includes(term) ||
        normalizeSearchText(entry.receiver_name).includes(term) ||
        normalizeSearchText(entry.item_name).includes(term) ||
        normalizeSearchText(entry.item_code).includes(term) ||
        normalizeSearchText(entry.unit_code).includes(term) ||
        normalizeSearchText(entry.notes).includes(term)
      )
    })
  }, [entries, search])

  const selectedEntry = selectedId
    ? filteredEntries.find((entry) => entry.id === selectedId) ?? null
    : null

  function closeEntry() {
    setSelectedId(null)
  }

  function clearFilters() {
    setSearch('')
    setSelectedId(null)
  }

  const hasFilters = Boolean(search)

  return (
    <section className="mt-8 rounded-2xl bg-white p-4 shadow sm:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Historial de devoluciones</h2>
          <p className="text-sm text-slate-500">
            Resultados: {filteredEntries.length}
            {limit ? ` de los últimos ${limit} registros` : ''}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Buscar por usuario, ítem, código, recibido por o notas"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm lg:w-96"
          />
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

      {filteredEntries.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[128px_minmax(0,1fr)_minmax(0,1fr)_96px_minmax(0,1fr)] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Fecha</span>
              <span>Usuario</span>
              <span>Ítem</span>
              <span>Total</span>
              <span>Recibido por</span>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredEntries.map((entry) => {
                const selected = selectedEntry?.id === entry.id

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedId(entry.id)}
                    className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[128px_minmax(0,1fr)_minmax(0,1fr)_96px_minmax(0,1fr)] md:items-center md:gap-3 ${
                      selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-500">
                      {entry.created_at ? formatDateTime(entry.created_at) : '-'}
                    </span>
                    <span className="truncate font-medium text-slate-800">
                      {entry.borrower_name}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {entry.item_name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {entry.item_code}
                      </span>
                    </span>
                    <span className="font-semibold text-slate-800">{getTotal(entry)}</span>
                    <span className="truncate text-slate-600">{entry.receiver_name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <DetailDrawer isOpen={Boolean(selectedEntry)} onClose={closeEntry}>
            {selectedEntry && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">
                    {selectedEntry.created_at ? formatDateTime(selectedEntry.created_at) : '-'}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {selectedEntry.item_name}
                  </h3>
                    <p className="text-sm text-slate-500">
                      {selectedEntry.item_code} | Unidad: {selectedEntry.unit_code || '-'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEntry}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-slate-700">Usuario</p>
                    <p className="mt-1 text-slate-600">{selectedEntry.borrower_name}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Recibido por</p>
                    <p className="mt-1 text-slate-600">{selectedEntry.receiver_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm">
                  <p><span className="block text-xs text-slate-500">OK</span>{selectedEntry.quantity_ok}</p>
                  <p><span className="block text-xs text-slate-500">Dañado</span>{selectedEntry.quantity_damaged}</p>
                  <p><span className="block text-xs text-slate-500">Faltante</span>{selectedEntry.quantity_missing}</p>
                </div>

                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {getResultLabel(selectedEntry)}
                </p>

                {selectedEntry.notes && (
                  <div>
                    <p className="font-medium text-slate-700">Notas</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedEntry.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DetailDrawer>
        </>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No se encontraron resultados para la búsqueda.
        </p>
      )}
    </section>
  )
}
