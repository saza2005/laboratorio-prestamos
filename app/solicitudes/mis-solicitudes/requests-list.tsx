'use client'

import { useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import { CancelRequestButton } from '../cancel-request-button'
import { formatDateTime } from '@/lib/format-date'
import {
  formatRequestStatus,
  requestStatusBadgeClass as statusBadgeClass,
} from '@/lib/status-format'

type RequestItem = {
  id: string
  quantity_requested: number
  items: {
    name?: string
    code?: string
  } | null
}

type RequestGroupItem = {
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

type RequestRow = {
  id: string
  status: string
  requested_at: string
  purpose: string | null
  comments: string | null
  scheduled_return_date: string | null
  request_items: RequestItem[]
  request_groups: RequestGroup[]
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
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null
    return requests.find((request) => request.id === selectedRequestId) ?? null
  }, [requests, selectedRequestId])

  if (requests.length === 0) {
    return <p className="text-slate-500">Aún no tienes solicitudes registradas.</p>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="hidden grid-cols-[112px_116px_minmax(0,1fr)_120px_112px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
          <span>Fecha</span>
          <span>Tipo</span>
          <span>Resumen</span>
          <span>Devolución</span>
          <span>Estado</span>
        </div>

        <div className="divide-y divide-slate-200">
          {requests.map((request) => {
            const selected = selectedRequest?.id === request.id

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
                      request.status
                    )}`}
                  >
                    {formatRequestStatus(request.status)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

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
                    selectedRequest.status
                  )}`}
                >
                  {formatRequestStatus(selectedRequest.status)}
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
                        {requestItem.items?.code ?? '-'} | Cantidad:{' '}
                        {requestItem.quantity_requested}
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
