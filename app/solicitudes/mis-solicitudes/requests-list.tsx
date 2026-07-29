'use client'

import { useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import { getVisibleRequestStatus } from '@/lib/request-delivery-status'
import { CancelRequestButton } from '../cancel-request-button'
import { formatDateTime } from '@/lib/format-date'
import { normalizeSearchText } from '@/lib/item-format'
import {
  formatRequestStatus,
  requestStatusBadgeClass as statusBadgeClass,
} from '@/lib/status-format'

type RequestItem = {
  id: string
  quantity_requested: number
  quantity_approved: number
  quantity_delivered: number
  items: {
    name?: string
    code?: string
  } | null
}

type RequestGroupItem = {
  item_id: string | null
  quantity: number
  items: {
    name?: string
    code?: string
  } | null
}

type RequestGroup = {
  id: string
  group_name: string
  leader: {
    full_name?: string
  } | null
  request_group_items: RequestGroupItem[]
}

type LoanItem = {
  item_id: string | null
  quantity: number
}

type RequestLoan = {
  id: string
  loan_items: LoanItem[]
}

type RequestRow = {
  id: string
  status: string
  requested_at: string
  purpose: string | null
  comments: string | null
  scheduled_return_date: string | null
  request_items: RequestItem[]
  request_groups: RequestGroup[]
  loans: RequestLoan[]
}

type RequestsListProps = {
  requests: RequestRow[]
}

function getRequestType(request: RequestRow) {
  return request.request_groups.length > 0 ? 'Grupal' : 'Individual'
}

function getItemCount(request: RequestRow) {
  if (request.request_groups.length > 0) {
    return request.request_groups.reduce(
      (total, group) => total + group.request_group_items.length,
      0
    )
  }

  return request.request_items.length
}

function getPreviewText(request: RequestRow) {
  if (request.request_groups.length > 0) {
    return `${request.request_groups.length} grupo(s), ${getItemCount(request)} ítem(s)`
  }

  const firstItem = request.request_items[0]?.items?.name
  if (!firstItem) return `${getItemCount(request)} ítem(s)`

  return request.request_items.length > 1
    ? `${firstItem} +${request.request_items.length - 1}`
    : firstItem
}

export function RequestsList({ requests }: RequestsListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const filteredRequests = useMemo(() => {
    const term = normalizeSearchText(search)

    return requests.filter((request) => {
      const visibleStatus = getVisibleRequestStatus(request)
      const matchesStatus = statusFilter
        ? visibleStatus === statusFilter || request.status === statusFilter
        : true
      const itemsText = normalizeSearchText([
        ...request.request_items.map(
          (item) => `${item.items?.name ?? ''} ${item.items?.code ?? ''}`
        ),
        ...request.request_groups.flatMap((group) =>
          group.request_group_items.map(
            (item) => `${item.items?.name ?? ''} ${item.items?.code ?? ''}`
          )
        ),
      ]
        .join(' '))
      const matchesSearch =
        !term ||
        normalizeSearchText(getRequestType(request)).includes(term) ||
        normalizeSearchText(request.purpose).includes(term) ||
        normalizeSearchText(request.comments).includes(term) ||
        itemsText.includes(term)

      return matchesStatus && matchesSearch
    })
  }, [requests, search, statusFilter])

  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null
    return (
      filteredRequests.find((request) => request.id === selectedRequestId) ??
      null
    )
  }, [filteredRequests, selectedRequestId])

  function clearFilters() {
    setSearch('')
    setStatusFilter('')
    setSelectedRequestId(null)
  }

  const hasFilters = Boolean(search || statusFilter)

  if (requests.length === 0) {
    return <p className="text-slate-500">Aún no tienes solicitudes registradas.</p>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_auto]">
          <input
            type="text"
            placeholder="Buscar por propósito, ítem, código o tipo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobada</option>
            <option value="rejected">Rechazada</option>
            <option value="delivered">Entregada</option>
            <option value="partial_delivery">Entregada parcialmente</option>
            <option value="returned">Devuelta</option>
            <option value="cancelled">Cancelada</option>
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
        <p className="mt-3 text-sm text-slate-500">
          Resultados: {filteredRequests.length} de {requests.length}
        </p>
      </div>

      {filteredRequests.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="hidden grid-cols-[112px_116px_minmax(0,1fr)_120px_112px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
          <span>Fecha</span>
          <span>Tipo</span>
          <span>Resumen</span>
          <span>Devolución</span>
          <span>Estado</span>
        </div>

          <div className="divide-y divide-slate-200">
          {filteredRequests.map((request) => {
            const selected = selectedRequest?.id === request.id
            const visibleStatus = getVisibleRequestStatus(request)

            return (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedRequestId(request.id)}
                className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[112px_116px_minmax(0,1fr)_120px_112px] md:items-center md:gap-3 ${
                  selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <span className="text-slate-500">
                  {formatDateTime(request.requested_at)}
                </span>
                <span className="font-medium text-slate-800">
                  {getRequestType(request)}
                </span>
                <span className="min-w-0 text-slate-700 md:truncate">
                  {request.purpose || getPreviewText(request)}
                </span>
                <span className="text-slate-500">
                  {request.scheduled_return_date || '-'}
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
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-slate-500">
            No hay solicitudes que coincidan con los filtros.
          </p>
        </div>
      )}

      <DetailDrawer isOpen={Boolean(selectedRequest)} onClose={() => setSelectedRequestId(null)}>
        {selectedRequest && (
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  {formatDateTime(selectedRequest.requested_at)}
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  Solicitud {getRequestType(selectedRequest).toLowerCase()}
                </h3>
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
                  onClick={() => setSelectedRequestId(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-slate-700">Propósito</p>
                <p className="mt-1 text-slate-600">
                  {selectedRequest.purpose || '-'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-medium text-slate-700">Devolución estimada</p>
                  <p className="mt-1 text-slate-600">
                    {selectedRequest.scheduled_return_date || '-'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Ítems</p>
                  <p className="mt-1 text-slate-600">
                    {getItemCount(selectedRequest)} registrado(s)
                  </p>
                </div>
              </div>

              {selectedRequest.comments && (
                <div>
                  <p className="font-medium text-slate-700">Comentarios</p>
                  <p className="mt-1 text-slate-600">{selectedRequest.comments}</p>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="mb-3 font-medium">Detalle de materiales</p>

              {selectedRequest.request_groups.length > 0 ? (
                <div className="space-y-3">
                  {selectedRequest.request_groups.map((group) => {
                    const leader = group.leader

                    return (
                      <div key={group.id} className="rounded-lg bg-slate-50 p-3">
                        <p className="text-sm font-medium">
                          {group.group_name} - {leader?.full_name ?? 'Sin asignar'}
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-slate-600">
                          {group.request_group_items.map((groupItem, index) => {
                            const item = groupItem.items
                            return (
                              <li key={index}>
                                {item?.name ?? 'Ítem'} - {groupItem.quantity}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <ul className="space-y-2 text-sm text-slate-600">
                  {selectedRequest.request_items.map((requestItem) => (
                    <li
                      key={requestItem.id}
                      className="rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <span className="font-medium text-slate-800">
                        {requestItem.items?.name ?? 'Ítem'}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {requestItem.items?.code ?? '-'} | Solicitada:{' '}
                        {requestItem.quantity_requested}
                        {requestItem.quantity_approved > 0 && (
                          <>
                            {' '}| Aprobada: {requestItem.quantity_approved} |
                            Entregada: {requestItem.quantity_delivered}
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedRequest.status === 'pending' && (
              <CancelRequestButton requestId={selectedRequest.id} />
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  )
}
