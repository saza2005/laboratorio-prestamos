'use client'

import { useActionState } from 'react'
import {
  approveRequestWithState,
  deliverRequestWithState,
  rejectRequestWithState,
} from './actions'

type StaffRequestItem = {
  id: string
  quantity_requested: number
  item: {
    name?: string
    code?: string
    stock_available?: number
  } | null
}

type StaffRequestGroup = {
  id: string
  group_name: string
  leader: {
    full_name?: string
  } | null
  request_group_items: Array<{
    quantity: number
    item: {
      name?: string
      code?: string
    } | null
  }>
}

type RequestActionsPanelProps = {
  request: {
    id: string
    status: string
    request_items: StaffRequestItem[]
    request_groups: StaffRequestGroup[]
  }
}

function ActionError({ error }: { error: string | null }) {
  if (!error) return null

  return (
    <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </p>
  )
}

function GroupSummary({ groups }: { groups: StaffRequestGroup[] }) {
  if (groups.length === 0) return null

  return (
    <div className="rounded-xl border p-4 mb-4 bg-slate-50">
      <h3 className="font-semibold mb-3">Grupos</h3>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="border rounded-lg p-3 bg-white">
            <p className="font-medium text-sm">
              {group.group_name} - {group.leader?.full_name ?? 'Sin asignar'}
            </p>

            <ul className="mt-2 text-sm space-y-1">
              {group.request_group_items.map((groupItem, index) => (
                <li key={index}>
                  {groupItem.item?.name ?? 'Ítem'} - {groupItem.quantity}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApproveForm({ request }: RequestActionsPanelProps) {
  const [state, formAction, isPending] = useActionState(approveRequestWithState, {
    error: null,
  })
  const hasGroups = request.request_groups.length > 0

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border p-4"
      onSubmit={(event) => {
        if (!confirm('¿Seguro que deseas aprobar esta solicitud?')) {
          event.preventDefault()
        }
      }}
    >
      <h3 className="font-semibold">
        {hasGroups ? 'Aprobar solicitud por grupos' : 'Aprobar solicitud'}
      </h3>

      <input type="hidden" name="request_id" value={request.id} />

      {hasGroups ? (
        <p className="text-sm text-slate-600">
          Esta solicitud contiene grupos asignados. La aprobación se realizará de
          forma completa para todos los grupos y materiales solicitados.
        </p>
      ) : (
        <div className="space-y-3">
          {request.request_items.map((requestItem) => {
            const maximumApprovable = Math.min(
              requestItem.quantity_requested,
              requestItem.item?.stock_available ?? 0
            )

            return (
            <div
              key={requestItem.id}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
            >
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  {requestItem.item?.name ?? 'Ítem'} [{requestItem.item?.code ?? '-'}]
                </label>
                <p className="text-xs text-slate-500">
                  Solicitado: {requestItem.quantity_requested} | Disponible:{' '}
                  {requestItem.item?.stock_available ?? 0}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Cantidad aprobada
                </label>
                <input
                  type="number"
                  name="quantity_approved"
                  min="0"
                  max={maximumApprovable}
                  defaultValue={maximumApprovable}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="hidden"
                  name="request_item_id"
                  value={requestItem.id}
                />
              </div>
            </div>
            )
          })}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 text-white px-5 py-2.5 font-medium hover:bg-blue-700 transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Aprobando...' : hasGroups ? 'Aprobar solicitud completa' : 'Aprobar'}
      </button>
      <ActionError error={state.error} />
    </form>
  )
}

function RejectForm({ requestId }: { requestId: string }) {
  const [state, formAction, isPending] = useActionState(rejectRequestWithState, {
    error: null,
  })

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border p-4"
      onSubmit={(event) => {
        if (!confirm('¿Seguro que deseas rechazar esta solicitud?')) {
          event.preventDefault()
        }
      }}
    >
      <h3 className="font-semibold">Rechazar solicitud</h3>

      <input type="hidden" name="request_id" value={requestId} />

      <div>
        <label className="block text-sm font-medium mb-1">
          Motivo del rechazo
        </label>
        <textarea
          name="rejection_reason"
          rows={5}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Explique por qué se rechaza la solicitud"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-red-600 text-white px-5 py-2.5 font-medium hover:bg-red-700 transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Rechazando...' : 'Rechazar'}
      </button>
      <ActionError error={state.error} />
    </form>
  )
}

function DeliverForm({ requestId }: { requestId: string }) {
  const [state, formAction, isPending] = useActionState(deliverRequestWithState, {
    error: null,
  })

  return (
    <form
      action={formAction}
      className="rounded-xl border p-4 space-y-4"
      onSubmit={(event) => {
        if (!confirm('¿Seguro que deseas entregar esta solicitud y crear el préstamo?')) {
          event.preventDefault()
        }
      }}
    >
      <h3 className="font-semibold">Registrar entrega</h3>

      <input type="hidden" name="request_id" value={requestId} />

      <div>
        <label className="block text-sm font-medium mb-1">
          Notas de entrega
        </label>
        <textarea
          name="delivery_notes"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Observaciones al momento de entregar"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-green-600 text-white px-5 py-2.5 font-medium hover:bg-green-700 transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Entregando...' : 'Confirmar entrega y crear préstamo'}
      </button>
      <ActionError error={state.error} />
    </form>
  )
}

export function RequestActionsPanel({ request }: RequestActionsPanelProps) {
  if (request.status === 'pending') {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <GroupSummary groups={request.request_groups} />
          <ApproveForm request={request} />
        </div>
        <RejectForm requestId={request.id} />
      </div>
    )
  }

  if (request.status === 'approved') {
    return <DeliverForm requestId={request.id} />
  }

  return null
}
