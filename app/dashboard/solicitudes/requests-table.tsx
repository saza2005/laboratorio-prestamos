'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatDateTime } from '@/lib/format-date'

type StaffRequestItem = {
  id: string
  quantity_requested: number
  quantity_approved: number
  item: {
    id?: string
    name?: string
    code?: string
    stock_available?: number
    asset_codes?: string[]
  } | null
}

type StaffRequestRow = {
  id: string
  status: string
  requested_at: string
  purpose: string | null
  comments: string | null
  scheduled_return_date: string | null
  rejection_reason: string | null
  requester: {
    full_name?: string
    email?: string
  } | null
  loan: {
    id?: string
    status?: string
    delivery_date?: string
    expected_return_date?: string
  } | null
  request_items: StaffRequestItem[]
  actions: React.ReactNode
}

type RequestsTableProps = {
  requests: StaffRequestRow[]
  limit?: number
}

function formatRequestStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'approved':
      return 'Aprobada'
    case 'rejected':
      return 'Rechazada'
    case 'cancelled':
      return 'Cancelada'
    case 'delivered':
      return 'Entregada'
    case 'returned':
      return 'Devuelta'
    case 'partial_return':
      return 'Devolución parcial'
    default:
      return status
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700'
    case 'approved':
      return 'bg-blue-100 text-blue-700'
    case 'rejected':
      return 'bg-red-100 text-red-700'
    case 'delivered':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function RequestsTable({ requests, limit }: RequestsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase()

    return requests.filter((req) => {
      const matchesStatus = statusFilter
        ? req.status === statusFilter || req.loan?.status === statusFilter
        : true

      const requesterName = req.requester?.full_name?.toLowerCase() ?? ''
      const requesterEmail = req.requester?.email?.toLowerCase() ?? ''
      const purpose = req.purpose?.toLowerCase() ?? ''
      const comments = req.comments?.toLowerCase() ?? ''
      const itemsText = req.request_items
        .map((ri) =>
          `${ri.item?.name ?? ''} ${ri.item?.code ?? ''} ${
            ri.item?.asset_codes?.join(' ') ?? ''
          }`.toLowerCase()
        )
        .join(' ')

      const matchesSearch =
        !term ||
        requesterName.includes(term) ||
        requesterEmail.includes(term) ||
        purpose.includes(term) ||
        comments.includes(term) ||
        itemsText.includes(term)

      return matchesStatus && matchesSearch
    })
  }, [requests, search, statusFilter])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow p-4 sm:p-6">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Buscar por solicitante, correo, propósito, ítem o código patrimonial"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobada</option>
            <option value="rejected">Rechazada</option>
            <option value="delivered">Entregada</option>
            <option value="returned">Devuelta</option>
            <option value="partial_return">Devolución parcial</option>
            <option value="cancelled">Cancelada</option>
          </select>

          <div className="flex items-center text-sm text-slate-600">
            Resultados: {filteredRequests.length}
            {limit ? ` de las últimas ${limit} solicitudes` : ''}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl bg-white shadow p-4 space-y-4 sm:p-6"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {formatDateTime(req.requested_at)}
                  </p>
                  <p className="font-semibold">
                    Solicitante: {req.requester?.full_name ?? 'Sin nombre'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {req.requester?.email ?? '-'}
                  </p>
                </div>

                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                    req.status
                  )}`}
                >
                  {formatRequestStatus(req.status)}
                </span>
              </div>

              {req.purpose && (
                <p className="text-sm">
                  <span className="font-medium">Propósito:</span> {req.purpose}
                </p>
              )}

              {req.comments && (
                <p className="text-sm">
                  <span className="font-medium">Comentarios:</span> {req.comments}
                </p>
              )}

              {req.scheduled_return_date && (
                <p className="text-sm">
                  <span className="font-medium">Devolución estimada:</span>{' '}
                  {req.scheduled_return_date}
                </p>
              )}

              {req.status === 'rejected' && req.rejection_reason && (
                <p className="text-sm text-red-700">
                  <span className="font-medium">Motivo de rechazo:</span>{' '}
                  {req.rejection_reason}
                </p>
              )}

                {req.loan && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
                    <p className="font-medium text-green-800">Préstamo generado</p>
                    <p className="text-green-700">
                    ID: {req.loan.id ?? '-'}
                    </p>
                    <p className="text-green-700">
                    Estado del préstamo: {req.loan.status ?? '-'}
                    </p>
                    <p className="text-green-700">
                    Fecha de entrega:{' '}
                    {req.loan.delivery_date
                        ? formatDateTime(req.loan.delivery_date)
                        : '-'}
                    </p>

                    <div className="mt-3">
                    <Link
                        href="/prestamos"
                        className="inline-block rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition"
                    >
                        Ver préstamos
                    </Link>
                    </div>
                </div>
                )}

              <div className="space-y-2 md:hidden">
                {req.request_items.map((requestItem) => (
                  <div key={requestItem.id} className="rounded-lg border bg-slate-50 p-3 text-sm">
                    <p className="font-medium">
                      {requestItem.item?.name ?? '-'} [{requestItem.item?.code ?? '-'}]
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <p>
                        <span className="block text-xs text-slate-500">Solicitado</span>
                        {requestItem.quantity_requested}
                      </p>
                      <p>
                        <span className="block text-xs text-slate-500">Aprobado</span>
                        {requestItem.quantity_approved}
                      </p>
                      <p>
                        <span className="block text-xs text-slate-500">Disponible</span>
                        {requestItem.item?.stock_available ?? 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[680px] text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="text-left px-4 py-3">Ítem</th>
                      <th className="text-left px-4 py-3">Código</th>
                      <th className="text-left px-4 py-3">Solicitado</th>
                      <th className="text-left px-4 py-3">Aprobado</th>
                      <th className="text-left px-4 py-3">Disponible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {req.request_items.map((ri) => (
                      <tr key={ri.id} className="border-t">
                        <td className="px-4 py-3">{ri.item?.name ?? '-'}</td>
                        <td className="px-4 py-3">{ri.item?.code ?? '-'}</td>
                        <td className="px-4 py-3">{ri.quantity_requested}</td>
                        <td className="px-4 py-3">{ri.quantity_approved}</td>
                        <td className="px-4 py-3">
                          {ri.item?.stock_available ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {req.actions}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-white shadow p-6">
            <p className="text-slate-500">
              No hay solicitudes que coincidan con los filtros.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}