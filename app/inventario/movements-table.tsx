'use client'

import { useMemo, useState } from 'react'
import { formatDateTime } from '@/lib/format-date'

type Movement = {
  id: string
  type: string
  quantity: number
  notes: string | null
  created_at: string
  item_name: string
  item_code: string
  user_name: string
}

function formatMovementType(type: string) {
  switch (type) {
    case 'loan_out':
      return 'Préstamo'
    case 'return_ok':
      return 'Devolución OK'
    case 'return_damaged':
      return 'Devuelto dañado'
    case 'return_missing':
      return 'Reportado faltante'
    case 'adjustment_up':
      return 'Ajuste positivo'
    case 'adjustment_down':
      return 'Ajuste negativo'
    default:
      return type
  }
}

export function MovementsTable({
  data,
  limit,
}: {
  data: Movement[]
  limit?: number
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const filtered = useMemo(() => {
    return data.filter((m) => {
      const text = search.toLowerCase()

      const matchesSearch =
        m.item_name.toLowerCase().includes(text) ||
        m.item_code.toLowerCase().includes(text) ||
        m.user_name.toLowerCase().includes(text) ||
        (m.notes ?? '').toLowerCase().includes(text)

      const matchesType = typeFilter ? m.type === typeFilter : true

      const movementDate = new Date(m.created_at)

      const matchesFrom = fromDate
        ? movementDate >= new Date(fromDate)
        : true

      const matchesTo = toDate
        ? movementDate <= new Date(toDate + 'T23:59:59')
        : true

      return matchesSearch && matchesType && matchesFrom && matchesTo
    })
  }, [data, search, typeFilter, fromDate, toDate])

  return (
    <div className="mt-8 rounded-2xl bg-white shadow overflow-hidden">
      <div className="p-6 border-b space-y-4">
        <h2 className="text-xl font-semibold">Movimientos de inventario</h2>

        <div className="grid md:grid-cols-4 gap-3">
          {/* 🔎 búsqueda */}
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />

          {/* 🎯 tipo */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="loan_out">Préstamo</option>
            <option value="return_ok">Devolución OK</option>
            <option value="return_damaged">Dañado</option>
            <option value="return_missing">Faltante</option>
          </select>

          {/* 📅 desde */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />

          {/* 📅 hasta */}
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
        </div>

        <p className="text-sm text-slate-500">
          Resultados: {filtered.length}
          {limit ? ` de los últimos ${limit} movimientos` : ''}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Ítem</th>
              <th className="px-4 py-3 text-left">Cantidad</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Notas</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length > 0 ? (
              filtered.map((m) => (
                <tr key={m.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {formatDateTime(m.created_at)}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {formatMovementType(m.type)}
                  </td>

                  <td className="px-4 py-3">
                    {m.item_name} [{m.item_code}]
                  </td>

                  <td className="px-4 py-3">{m.quantity}</td>

                  <td className="px-4 py-3">{m.user_name}</td>

                  <td className="px-4 py-3">{m.notes || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500">
                  No hay resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}