'use client'

import { useMemo, useState } from 'react'
import { formatDateTime } from '@/lib/format-date'

type PendingLoanItem = {
  id: string
  quantity: number
  returned_quantity: number
  damaged_quantity: number
  missing_quantity: number | null
  item_id: string
  item_unit_id: string | null
  item_units: {
    asset_code?: string | null
    serial_code?: string | null
  } | null
  items: {
    id?: string
    name?: string
    code?: string
  } | null
  loans: {
    id?: string
    status?: string
    user_id?: string
    delivery_date?: string
    expected_return_date?: string
    loan_groups?: Array<{
      id: string
      group_name: string
      leader?: {
        full_name?: string
        email?: string
      } | null
      loan_group_items?: Array<{
        id: string
        item_id?: string
        quantity: number
        items?: {
          id?: string
          name?: string
          code?: string
        } | null
      }>
    }>
  } | null
  loan_user: {
    user_id?: string
    profiles?: {
      full_name?: string
      email?: string
    } | null
  } | null
}

type PendingReturnsListProps = {
  loanItems: PendingLoanItem[]
}

function formatLoanStatus(status: string | undefined) {
  switch (status) {
    case 'active':
      return 'Activo'
    case 'partial_return':
      return 'Devolución parcial'
    case 'overdue':
      return 'Vencido'
    case 'returned':
      return 'Devuelto'
    default:
      return status ?? '-'
  }
}

function statusBadgeClass(status: string | undefined) {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'partial_return':
      return 'bg-amber-100 text-amber-700'
    case 'overdue':
      return 'bg-red-100 text-red-700'
    case 'returned':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function getPending(item: PendingLoanItem) {
  return item.quantity - item.returned_quantity - (item.missing_quantity ?? 0)
}

function getUnitCode(item: PendingLoanItem) {
  return item.item_units?.asset_code || item.item_units?.serial_code || '-'
}

function getMatchingGroups(item: PendingLoanItem) {
  return (item.loans?.loan_groups ?? [])
    .map((group) => ({
      ...group,
      matchingItems:
        group.loan_group_items?.filter((groupItem) => groupItem.item_id === item.item_id) ?? [],
    }))
    .filter((group) => group.matchingItems.length > 0)
}

export function PendingReturnsList({ loanItems }: PendingReturnsListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState(loanItems[0]?.id ?? '')

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()

    return loanItems.filter((item) => {
      const matchesStatus = statusFilter ? item.loans?.status === statusFilter : true
      const userName = item.loan_user?.profiles?.full_name?.toLowerCase() ?? ''
      const userEmail = item.loan_user?.profiles?.email?.toLowerCase() ?? ''
      const itemName = item.items?.name?.toLowerCase() ?? ''
      const itemCode = item.items?.code?.toLowerCase() ?? ''
      const unitCode = getUnitCode(item).toLowerCase()
      const groups = (item.loans?.loan_groups ?? [])
        .map((group) => `${group.group_name} ${group.leader?.full_name ?? ''}`)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !term ||
        userName.includes(term) ||
        userEmail.includes(term) ||
        itemName.includes(term) ||
        itemCode.includes(term) ||
        unitCode.includes(term) ||
        groups.includes(term)

      return matchesStatus && matchesSearch
    })
  }, [loanItems, search, statusFilter])

  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null

  return (
    <section className="rounded-2xl bg-white p-4 shadow sm:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Préstamos pendientes</h2>
          <p className="text-sm text-slate-500">
            Selecciona un registro para revisar cantidades, usuario, unidad y grupos.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px]">
          <input
            type="text"
            placeholder="Buscar por usuario, ítem, código, unidad o grupo"
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
            <option value="active">Activo</option>
            <option value="partial_return">Devolución parcial</option>
            <option value="overdue">Vencido</option>
          </select>
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_120px_92px_132px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Usuario</span>
              <span>Ítem</span>
              <span>Unidad</span>
              <span>Pendiente</span>
              <span>Estado</span>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredItems.map((item) => {
                const selected = selectedItem?.id === item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_120px_92px_132px] md:items-center md:gap-3 ${
                      selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {item.loan_user?.profiles?.full_name ?? 'Sin nombre'}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.loan_user?.profiles?.email ?? '-'}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {item.items?.name ?? 'Ítem'}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {item.items?.code ?? '-'}
                      </span>
                    </span>
                    <span className="truncate text-slate-600">{getUnitCode(item)}</span>
                    <span className="font-semibold text-amber-700">{getPending(item)}</span>
                    <span>
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(
                          item.loans?.status
                        )}`}
                      >
                        {formatLoanStatus(item.loans?.status)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 xl:sticky xl:top-4 xl:self-start">
            {selectedItem ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedItem.items?.name ?? 'Ítem'}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedItem.items?.code ?? '-'} | Unidad: {getUnitCode(selectedItem)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                      selectedItem.loans?.status
                    )}`}
                  >
                    {formatLoanStatus(selectedItem.loans?.status)}
                  </span>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <p className="font-medium text-slate-700">Usuario</p>
                    <p className="mt-1 text-slate-600">
                      {selectedItem.loan_user?.profiles?.full_name ?? 'Sin nombre'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedItem.loan_user?.profiles?.email ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Entrega</p>
                    <p className="mt-1 text-slate-600">
                      {selectedItem.loans?.delivery_date
                        ? formatDateTime(selectedItem.loans.delivery_date)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Devolución esperada</p>
                    <p className="mt-1 text-slate-600">
                      {selectedItem.loans?.expected_return_date || '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm">
                  <p><span className="block text-xs text-slate-500">Prestado</span>{selectedItem.quantity}</p>
                  <p><span className="block text-xs text-slate-500">Devuelto</span>{selectedItem.returned_quantity}</p>
                  <p><span className="block text-xs text-slate-500">Perdido</span>{selectedItem.missing_quantity ?? 0}</p>
                  <p><span className="block text-xs text-slate-500">Pendiente</span>{getPending(selectedItem)}</p>
                </div>

                {getMatchingGroups(selectedItem).length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <p className="mb-3 font-medium">Distribución por grupos</p>
                    <div className="space-y-2">
                      {getMatchingGroups(selectedItem).map((group) => (
                        <div key={group.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <p className="font-medium text-slate-800">{group.group_name}</p>
                          <p className="text-xs text-slate-500">
                            Jefe: {group.leader?.full_name ?? 'Sin asignar'}
                          </p>
                          {group.matchingItems.map((groupItem) => (
                            <p key={groupItem.id} className="mt-1 text-slate-600">
                              Cantidad asignada: {groupItem.quantity}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  Para registrar la devolución, selecciona este ítem en el formulario superior.
                </p>
              </div>
            ) : null}
          </aside>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay préstamos pendientes que coincidan con los filtros.
        </p>
      )}
    </section>
  )
}
