'use client'

import { useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import { formatDateTime } from '@/lib/format-date'
import { normalizeSearchText } from '@/lib/item-format'

type ReturnHistoryEntry = {
  id: string
  return_id: string
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
  loan_status: string | null
  pending_quantity: number
}

type ReturnHistoryGroup = {
  id: string
  created_at: string | null
  borrower_name: string
  receiver_name: string
  loan_status: string | null
  notes: string | null
  items: ReturnHistoryEntry[]
}

type ReturnsHistoryProps = {
  entries: ReturnHistoryEntry[]
  limit?: number
}

function getTotal(entry: ReturnHistoryEntry) {
  return entry.quantity_ok + entry.quantity_damaged + entry.quantity_missing
}

function getGroupTotal(group: ReturnHistoryGroup) {
  return group.items.reduce((total, entry) => total + getTotal(entry), 0)
}

function getGroupTotals(group: ReturnHistoryGroup) {
  return group.items.reduce(
    (totals, entry) => ({
      ok: totals.ok + entry.quantity_ok,
      damaged: totals.damaged + entry.quantity_damaged,
      missing: totals.missing + entry.quantity_missing,
    }),
    { ok: 0, damaged: 0, missing: 0 }
  )
}

function getResultLabel(entry: ReturnHistoryEntry) {
  const labels = []
  if (entry.pending_quantity > 0) labels.push(`Pendiente: ${entry.pending_quantity}`)
  if (entry.quantity_ok > 0) labels.push(`OK: ${entry.quantity_ok}`)
  if (entry.quantity_damaged > 0) labels.push(`Dañado: ${entry.quantity_damaged}`)
  if (entry.quantity_missing > 0) labels.push(`Faltante: ${entry.quantity_missing}`)

  return labels.length > 0 ? labels.join(' | ') : 'Sin cantidades'
}

function hasDamagedItems(group: ReturnHistoryGroup) {
  return group.items.some((entry) => entry.quantity_damaged > 0)
}

function hasMissingItems(group: ReturnHistoryGroup) {
  return group.items.some((entry) => entry.quantity_missing > 0)
}

function matchesResultFilter(group: ReturnHistoryGroup, resultFilter: string) {
  if (!resultFilter) return true
  if (resultFilter === 'clean') return !hasDamagedItems(group) && !hasMissingItems(group)
  if (resultFilter === 'damaged') return hasDamagedItems(group)
  if (resultFilter === 'missing') return hasMissingItems(group)
  if (resultFilter === 'issues') return hasDamagedItems(group) || hasMissingItems(group)
  if (resultFilter === 'partial') return group.loan_status === 'partial_return' || group.loan_status === 'overdue'
  return true
}

function getResultBadge(group: ReturnHistoryGroup) {
  if (hasMissingItems(group)) {
    return {
      label: 'Con faltantes',
      className: 'bg-red-50 text-red-700 ring-red-200',
    }
  }

  if (hasDamagedItems(group)) {
    return {
      label: 'Con dañados',
      className: 'bg-amber-50 text-amber-700 ring-amber-200',
    }
  }

  if (group.loan_status === 'partial_return' || group.loan_status === 'overdue') {
    return {
      label: 'Devolución parcial',
      className: 'bg-amber-50 text-amber-700 ring-amber-200',
    }
  }

  return {
    label: 'Sin observaciones',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  }
}

function getItemsSummary(group: ReturnHistoryGroup) {
  return group.items
    .slice(0, 4)
    .map((entry) => `${entry.item_name} (${getTotal(entry)})`)
    .join(', ')
}

function groupReturns(entries: ReturnHistoryEntry[]) {
  const groups = new Map<string, ReturnHistoryGroup>()

  for (const entry of entries) {
    const group = groups.get(entry.return_id)

    if (group) {
      group.items.push(entry)
      if (!group.notes && entry.notes) group.notes = entry.notes
      continue
    }

    groups.set(entry.return_id, {
      id: entry.return_id,
      created_at: entry.created_at,
      borrower_name: entry.borrower_name,
      receiver_name: entry.receiver_name,
      loan_status: entry.loan_status,
      notes: entry.notes,
      items: [entry],
    })
  }

  return [...groups.values()].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0

    return timeB - timeA
  })
}

export function ReturnsHistory({ entries, limit }: ReturnsHistoryProps) {
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const groupedEntries = useMemo(() => groupReturns(entries), [entries])

  const filteredGroups = useMemo(() => {
    const term = normalizeSearchText(search)

    return groupedEntries.filter((group) => {
      if (!matchesResultFilter(group, resultFilter)) return false
      if (!term) return true

      return (
        normalizeSearchText(group.id).includes(term) ||
        normalizeSearchText(group.borrower_name).includes(term) ||
        normalizeSearchText(group.receiver_name).includes(term) ||
        normalizeSearchText(group.notes).includes(term) ||
        group.items.some((entry) =>
          normalizeSearchText(entry.item_name).includes(term) ||
          normalizeSearchText(entry.item_code).includes(term) ||
          normalizeSearchText(entry.unit_code).includes(term) ||
          normalizeSearchText(entry.notes).includes(term)
        )
      )
    })
  }, [groupedEntries, resultFilter, search])

  const selectedGroup = selectedId
    ? filteredGroups.find((group) => group.id === selectedId) ?? null
    : null

  function closeEntry() {
    setSelectedId(null)
  }

  function clearFilters() {
    setSearch('')
    setResultFilter('')
    setSelectedId(null)
  }

  const hasFilters = Boolean(search || resultFilter)

  return (
    <section className="surface-card mt-8 p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Historial de devoluciones</h2>
          <p className="text-sm text-slate-500">
            Resultados: {filteredGroups.length}
            {limit ? ` de las últimas ${limit} devoluciones` : ''}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(390px,1fr)_190px_auto]">
          <input
            type="text"
            placeholder="Buscar por ID, usuario, ítem, código, recibido por o notas"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={resultFilter}
            onChange={(event) => setResultFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="clean">Sin observaciones</option>
            <option value="issues">Con observaciones</option>
            <option value="damaged">Con dañados</option>
            <option value="missing">Con faltantes</option>
            <option value="partial">Devolución parcial</option>
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

      {filteredGroups.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[128px_minmax(0,1fr)_minmax(0,1fr)_96px_minmax(0,1fr)] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Fecha</span>
              <span>Usuario</span>
              <span>Materiales</span>
              <span>Total</span>
              <span>Recibido por</span>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredGroups.map((group) => {
                const selected = selectedGroup?.id === group.id

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedId(group.id)}
                    className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[128px_minmax(0,1fr)_minmax(0,1fr)_96px_minmax(0,1fr)] md:items-center md:gap-3 ${
                      selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-500">
                      {group.created_at ? formatDateTime(group.created_at) : '-'}
                    </span>
                    <span className="truncate font-medium text-slate-800">
                      {group.borrower_name}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {getItemsSummary(group) || 'Sin materiales'}
                        {group.items.length > 4 ? ' ...' : ''}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {group.items.length} ítem(s)
                      </span>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${getResultBadge(group).className}`}
                      >
                        {getResultBadge(group).label}
                      </span>
                    </span>
                    <span className="font-semibold text-slate-800">{getGroupTotal(group)}</span>
                    <span className="truncate text-slate-600">{group.receiver_name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <DetailDrawer isOpen={Boolean(selectedGroup)} onClose={closeEntry}>
            {selectedGroup && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">
                      {selectedGroup.created_at ? formatDateTime(selectedGroup.created_at) : '-'}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {selectedGroup.loan_status === 'partial_return' || selectedGroup.loan_status === 'overdue'
                        ? 'Devolución parcial registrada'
                        : 'Devolución registrada'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedGroup.items.length} ítem(s) | ID: {selectedGroup.id}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getResultBadge(selectedGroup).className}`}
                    >
                      {getResultBadge(selectedGroup).label}
                    </span>
                    {selectedGroup.loan_status === 'overdue' && (
                      <p className="mt-2 text-sm font-medium text-red-700">Préstamo vencido: aún tiene unidades pendientes.</p>
                    )}
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
                    <p className="mt-1 text-slate-600">{selectedGroup.borrower_name}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Recibido por</p>
                    <p className="mt-1 text-slate-600">{selectedGroup.receiver_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm">
                  <p><span className="block text-xs text-slate-500">OK</span>{getGroupTotals(selectedGroup).ok}</p>
                  <p><span className="block text-xs text-slate-500">Dañado</span>{getGroupTotals(selectedGroup).damaged}</p>
                  <p><span className="block text-xs text-slate-500">Faltante</span>{getGroupTotals(selectedGroup).missing}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 font-medium text-slate-800">Materiales devueltos</p>
                  <div className="space-y-2">
                    {selectedGroup.items.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_180px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{entry.item_name}</p>
                          <p className="truncate text-xs text-slate-500">
                            {entry.item_code} | Unidad: {entry.unit_code || '-'}
                          </p>
                        </div>
                        <p className="text-slate-700">{getResultLabel(entry)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedGroup.notes && (
                  <div>
                    <p className="font-medium text-slate-700">Notas</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedGroup.notes}</p>
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
