'use client'

import { useMemo, useState } from 'react'
import { formatDateTime } from '@/lib/format-date'

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

export function ReturnsHistory({ entries, limit }: ReturnsHistoryProps) {
  const [search, setSearch] = useState('')

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return entries

    return entries.filter((entry) => {
      return (
        entry.borrower_name.toLowerCase().includes(term) ||
        entry.receiver_name.toLowerCase().includes(term) ||
        entry.item_name.toLowerCase().includes(term) ||
        entry.item_code.toLowerCase().includes(term) ||
        (entry.unit_code ?? '').toLowerCase().includes(term) ||
        (entry.notes ?? '').toLowerCase().includes(term)
      )
    })
  }, [entries, search])

  return (
    <div className="mt-8 rounded-2xl bg-white shadow overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Historial de devoluciones</h2>
            <p className="text-sm text-slate-500 mt-1">
              Resultados: {filteredEntries.length}
              {limit ? ` de los últimos ${limit} registros` : ''}
            </p>
          </div>

          <div className="w-full md:w-96">
            <input
              type="text"
              placeholder="Buscar por usuario, ítem, código, recibido por o notas"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="divide-y md:hidden">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="space-y-2 p-4 text-sm">
              <div>
                <p className="font-medium">
                  {entry.item_name} [{entry.item_code}]
                </p>
                <p className="text-slate-500">
                  {entry.created_at ? formatDateTime(entry.created_at) : '-'}
                </p>
              </div>
              {entry.unit_code && (
                <p><span className="font-medium">Unidad:</span> {entry.unit_code}</p>
              )}
              <p><span className="font-medium">Usuario:</span> {entry.borrower_name}</p>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
                <p><span className="block text-xs text-slate-500">OK</span>{entry.quantity_ok}</p>
                <p><span className="block text-xs text-slate-500">Dañado</span>{entry.quantity_damaged}</p>
                <p><span className="block text-xs text-slate-500">Faltante</span>{entry.quantity_missing}</p>
              </div>
              <p><span className="font-medium">Recibido por:</span> {entry.receiver_name}</p>
              {entry.notes && (
                <p className="text-slate-600"><span className="font-medium">Notas:</span> {entry.notes}</p>
              )}
            </div>
          ))
        ) : (
          <p className="p-6 text-center text-slate-500">
            No se encontraron resultados para la búsqueda.
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[980px] text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Ítem</th>
              <th className="text-left px-4 py-3">Unidad</th>
              <th className="text-left px-4 py-3">OK</th>
              <th className="text-left px-4 py-3">Dañado</th>
              <th className="text-left px-4 py-3">Faltante</th>
              <th className="text-left px-4 py-3">Recibido por</th>
              <th className="text-left px-4 py-3">Notas</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {entry.created_at
                      ? formatDateTime(entry.created_at)
                      : '-'}
                  </td>
                  <td className="px-4 py-3">{entry.borrower_name}</td>
                  <td className="px-4 py-3">
                    {entry.item_name} [{entry.item_code}]
                  </td>
                  <td className="px-4 py-3">{entry.unit_code || '-'}</td>
                  <td className="px-4 py-3">{entry.quantity_ok}</td>
                  <td className="px-4 py-3">{entry.quantity_damaged}</td>
                  <td className="px-4 py-3">{entry.quantity_missing}</td>
                  <td className="px-4 py-3">{entry.receiver_name}</td>
                  <td className="px-4 py-3">{entry.notes || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                  No se encontraron resultados para la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}