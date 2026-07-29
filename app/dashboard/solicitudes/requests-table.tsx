'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import { formatDateTime } from '@/lib/format-date'
import { getVisibleRequestStatus } from '@/lib/request-delivery-status'
import {
  formatRequestStatus,
  requestStatusBadgeClass as statusBadgeClass,
} from '@/lib/status-format'

type StaffRequestItem = {
  id: string
  quantity_requested: number
  quantity_approved: number
  quantity_delivered: number
  item: {
    id?: string
    name?: string
    code?: string
    stock_available?: number
    asset_codes?: string[]
  } | null
}

type StaffRequestGroup = {
  id: string
  group_name: string
  leader: {
    full_name?: string
  } | null
  request_group_items: Array<{
    item_id: string | null
    quantity: number
    item: {
      id?: string
      name?: string
      code?: string
      stock_available?: number
      track_individual?: boolean
      asset_codes?: string[]
    } | null
  }>
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
  loans: Array<{
    id?: string
    loan_items: Array<{
      item_id: string | null
      quantity: number
    }>
  }>
  request_items: StaffRequestItem[]
  request_groups: StaffRequestGroup[]
  actions: React.ReactNode
}

type RequestsTableProps = {
  requests: StaffRequestRow[]
  limit?: number
}

function getRequestType(req: StaffRequestRow) {
  return req.request_groups.length > 0 ? 'Grupal' : 'Individual'
}

function getItemCount(req: StaffRequestRow) {
  if (req.request_groups.length > 0) {
    return req.request_groups.reduce(
      (total, group) => total + group.request_group_items.length,
      0
    )
  }

  return req.request_items.length
}

function getPreviewText(req: StaffRequestRow) {
  if (req.request_groups.length > 0) {
    return `${req.request_groups.length} grupo(s), ${getItemCount(req)} ítem(s)`
  }

  const firstItem = req.request_items[0]?.item?.name
  if (!firstItem) return `${getItemCount(req)} ítem(s)`

  return req.request_items.length > 1
    ? `${firstItem} +${req.request_items.length - 1}`
    : firstItem
}

export function RequestsTable({ requests, limit }: RequestsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase()

    return requests.filter((req) => {
      const visibleStatus = getVisibleRequestStatus(req)
      const matchesStatus = statusFilter
        ? visibleStatus === statusFilter ||
          req.status === statusFilter ||
          req.loan?.status === statusFilter
        : true

      const requesterName = req.requester?.full_name?.toLowerCase() ?? ''
      const requesterEmail = req.requester?.email?.toLowerCase() ?? ''
      const purpose = req.purpose?.toLowerCase() ?? ''
      const comments = req.comments?.toLowerCase() ?? ''
      const itemsText = [
        ...req.request_items.map((ri) =>
          `${ri.item?.name ?? ''} ${ri.item?.code ?? ''} ${
            ri.item?.asset_codes?.join(' ') ?? ''
          }`
        ),
        ...req.request_groups.flatMap((group) =>
          group.request_group_items.map((gi) =>
            `${gi.item?.name ?? ''} ${gi.item?.code ?? ''} ${
              gi.item?.asset_codes?.join(' ') ?? ''
            }`
          )
        ),
      ]
        .join(' ')
        .toLowerCase()

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

  const selectedRequest = selectedRequestId
    ? filteredRequests.find((req) => req.id === selectedRequestId) ?? null
    : null


  function openRequest(requestId: string) {
    setSelectedRequestId(requestId)
  }

  function closeRequest() {
    setSelectedRequestId(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
        <div className="grid gap-3 md:grid-cols-3">
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
            <option value="partial_delivery">Entregada parcialmente</option>
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

      {filteredRequests.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="hidden grid-cols-[128px_minmax(0,1.2fr)_112px_minmax(0,1fr)_124px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Fecha</span>
              <span>Solicitante</span>
              <span>Tipo</span>
              <span>Resumen</span>
              <span>Estado</span>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredRequests.map((req) => {
                const selected = selectedRequest?.id === req.id
                const visibleStatus = getVisibleRequestStatus(req)

                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => openRequest(req.id)}
                    className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[128px_minmax(0,1.2fr)_112px_minmax(0,1fr)_124px] md:items-center md:gap-3 ${
                      selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-500">
                      {formatDateTime(req.requested_at)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {req.requester?.full_name ?? 'Sin nombre'}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {req.requester?.email ?? '-'}
                      </span>
                    </span>
                    <span className="font-medium text-slate-700">
                      {getRequestType(req)}
                    </span>
                    <span className="min-w-0 truncate text-slate-700">
                      {req.purpose || getPreviewText(req)}
                    </span>
                    <span>
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                          visibleStatus
                        )}`}
                      >
                        {formatRequestStatus(visibleStatus)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <DetailDrawer isOpen={Boolean(selectedRequest)} onClose={closeRequest}>
            {selectedRequest && (
              <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(selectedRequest.requested_at)}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {selectedRequest.requester?.full_name ?? 'Sin nombre'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {selectedRequest.requester?.email ?? '-'}
                    </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                          getVisibleRequestStatus(selectedRequest)
                        )}`}
                      >
                        {formatRequestStatus(getVisibleRequestStatus(selectedRequest))}
                      </span>
                      <button
                        type="button"
                        onClick={closeRequest}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-slate-700">Tipo</p>
                    <p className="mt-1 text-slate-600">{getRequestType(selectedRequest)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Devolución estimada</p>
                    <p className="mt-1 text-slate-600">
                      {selectedRequest.scheduled_return_date || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Propósito</p>
                    <p className="mt-1 text-slate-600">
                      {selectedRequest.purpose || '-'}
                    </p>
                  </div>
                  {selectedRequest.comments && (
                    <div>
                      <p className="font-medium text-slate-700">Comentarios</p>
                      <p className="mt-1 text-slate-600">{selectedRequest.comments}</p>
                    </div>
                  )}
                </div>

                  {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                  <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <span className="font-medium">Motivo de rechazo:</span>{' '}
                    {selectedRequest.rejection_reason}
                  </p>
                )}

                  {selectedRequest.loan && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
                    <p className="font-medium text-green-800">Préstamo generado</p>
                    <p className="text-green-700">ID: {selectedRequest.loan.id ?? '-'}</p>
                    <p className="text-green-700">
                      Estado del préstamo: {selectedRequest.loan.status ?? '-'}
                    </p>
                    <p className="text-green-700">
                      Fecha de entrega:{' '}
                      {selectedRequest.loan.delivery_date
                        ? formatDateTime(selectedRequest.loan.delivery_date)
                        : '-'}
                    </p>
                    <Link
                      href="/prestamos"
                      className="mt-3 inline-block rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
                    >
                      Ver préstamos
                    </Link>
                  </div>
                )}

                  <div className="border-t border-slate-200 pt-4">
                  <p className="mb-3 font-medium">Materiales solicitados</p>

                  {selectedRequest.request_groups.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRequest.request_groups.map((group) => (
                        <div key={group.id} className="rounded-lg bg-slate-50 p-3">
                          <p className="text-sm font-medium">
                            {group.group_name} - {group.leader?.full_name ?? 'Sin asignar'}
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-600">
                            {group.request_group_items.map((groupItem, index) => (
                              <li key={index}>
                                {groupItem.item?.name ?? 'Ítem'} [{groupItem.item?.code ?? '-'}] - {groupItem.quantity}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-2 text-sm text-slate-600">
                      {selectedRequest.request_items.map((requestItem) => (
                        <li key={requestItem.id} className="rounded-lg bg-slate-50 px-3 py-2">
                          <span className="font-medium text-slate-800">
                            {requestItem.item?.name ?? 'Ítem'}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {requestItem.item?.code ?? '-'} | Disponible: {requestItem.item?.stock_available ?? 0}
                          </span>
                          <span className="mt-1 grid grid-cols-3 gap-2 text-xs">
                            <span>Solicitado: {requestItem.quantity_requested}</span>
                            <span>Aprobado: {requestItem.quantity_approved}</span>
                            <span>Entregado: {requestItem.quantity_delivered}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                  <div className="border-t border-slate-200 pt-4">
                    {selectedRequest.actions}
                  </div>
              </div>
            )}
          </DetailDrawer>
        </>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-slate-500">
            No hay solicitudes que coincidan con los filtros.
          </p>
        </div>
      )}
    </div>
  )
}
