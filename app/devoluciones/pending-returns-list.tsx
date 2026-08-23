'use client'

import { useActionState, useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import { useConfirmSubmit } from '@/components/confirm-submit'
import { createFullReturnWithState } from './actions'
import { formatDateTime } from '@/lib/format-date'
import { normalizeSearchText } from '@/lib/item-format'
import { formatLoanStatus, loanStatusBadgeClass as statusBadgeClass } from '@/lib/status-format'

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

function getLoanPendingItems(loanItems: PendingLoanItem[], loanId?: string) {
  if (!loanId) return []
  return loanItems.filter(
    (item) => item.loans?.id === loanId && getPending(item) > 0
  )
}

function getLoanPendingTotal(items: PendingLoanItem[]) {
  return items.reduce((total, item) => total + getPending(item), 0)
}

function getLoanPendingItemLabels(items: PendingLoanItem[]) {
  return items
    .slice(0, 4)
    .map((item) => (item.items?.name ?? 'Ítem') + ' (' + getPending(item) + ')')
    .join(', ')
}

function FullReturnForm({
  loanId,
  pendingItems,
  pendingTotal,
}: {
  loanId: string
  pendingItems: PendingLoanItem[]
  pendingTotal: number
}) {
  const [state, formAction, isPending] = useActionState(
    createFullReturnWithState,
    { error: null, success: null }
  )
  const confirmSubmit = useConfirmSubmit({
    title: 'Registrar devolución completa',
    message: 'Confirma que todos los materiales pendientes de este préstamo fueron recibidos en buen estado.',
    confirmLabel: 'Registrar completa',
  })

  return (
    <form
      action={formAction}
      onSubmit={confirmSubmit.onSubmit}
      className='rounded-xl border border-emerald-200 bg-emerald-50 p-4'
    >
      {confirmSubmit.dialog}
      <input type='hidden' name='loan_id' value={loanId} />

      <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
        <div>
          <p className='font-semibold text-emerald-900'>
            Devolver préstamo completo
          </p>
          <p className='mt-1 text-sm text-emerald-800'>
            Registra como buen estado todo lo pendiente de este préstamo.
          </p>
          <p className='mt-2 text-sm text-emerald-900'>
            Pendiente total: <span className='font-semibold'>{pendingTotal}</span> en {pendingItems.length} ítem(s).
          </p>
          <p className='mt-1 text-xs text-emerald-800'>
            {getLoanPendingItemLabels(pendingItems)}
            {pendingItems.length > 4 ? ' ...' : ''}
          </p>
        </div>

        <button
          type='submit'
          disabled={isPending || pendingTotal <= 0}
          className='shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {isPending ? 'Registrando...' : 'Devolución completa'}
        </button>
      </div>

      <label className='mt-3 block text-sm font-medium text-emerald-950'>
        Nota general
      </label>
      <textarea
        name='notes'
        rows={2}
        placeholder='Opcional'
        className='mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800'
      />

      {state.error && (
        <p className='mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          {state.error}
        </p>
      )}
    </form>
  )
}
export function PendingReturnsList({ loanItems }: PendingReturnsListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    const term = normalizeSearchText(search)

    return loanItems.filter((item) => {
      const matchesStatus = statusFilter ? item.loans?.status === statusFilter : true
      const userName = normalizeSearchText(item.loan_user?.profiles?.full_name)
      const userEmail = normalizeSearchText(item.loan_user?.profiles?.email)
      const itemName = normalizeSearchText(item.items?.name)
      const itemCode = normalizeSearchText(item.items?.code)
      const unitCode = normalizeSearchText(getUnitCode(item))
      const groupsText = (item.loans?.loan_groups ?? [])
        .map((group) => `${group.group_name} ${group.leader?.full_name ?? ''}`)
        .join(' ')
      const groups = normalizeSearchText(groupsText)
      const loanId = normalizeSearchText(item.loans?.id)

      const matchesSearch =
        !term ||
        userName.includes(term) ||
        userEmail.includes(term) ||
        itemName.includes(term) ||
        itemCode.includes(term) ||
        unitCode.includes(term) ||
        loanId.includes(term) ||
        groups.includes(term)

      return matchesStatus && matchesSearch
    })
  }, [loanItems, search, statusFilter])

  const filteredLoans = useMemo(() => {
    const loans = new Map<string, PendingLoanItem>()

    for (const item of filteredItems) {
      const loanId = item.loans?.id
      if (!loanId || loans.has(loanId)) continue
      loans.set(loanId, item)
    }

    return [...loans.values()]
  }, [filteredItems])

  const selectedItem = selectedId
    ? filteredLoans.find((item) => item.loans?.id === selectedId) ?? null
    : null
  const selectedLoanPendingItems = selectedItem
    ? getLoanPendingItems(loanItems, selectedItem.loans?.id)
    : []
  const selectedLoanPendingTotal = getLoanPendingTotal(selectedLoanPendingItems)

  function closeItem() {
    setSelectedId(null)
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('')
    setSelectedId(null)
  }

  const hasFilters = Boolean(search || statusFilter)

  return (
    <section className="surface-card p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Préstamos pendientes</h2>
          <p className="text-sm text-slate-500">
            Selecciona un préstamo para revisar sus materiales pendientes.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Resultados: {filteredLoans.length} préstamo(s)
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(390px,1fr)_190px_auto]">
          <input
            type="text"
            placeholder="Buscar por préstamo, usuario, ítem, código, unidad o grupo"
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

      {filteredLoans.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_120px_92px_132px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Usuario</span>
              <span>Materiales</span>
              <span>Ítems</span>
              <span>Pendiente</span>
              <span>Estado</span>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredLoans.map((item) => {
                const loanPendingItems = getLoanPendingItems(loanItems, item.loans?.id)
                const selected = selectedItem?.loans?.id === item.loans?.id

                return (
                  <button
                    key={item.loans?.id ?? item.id}
                    type="button"
                    onClick={() => setSelectedId(item.loans?.id ?? null)}
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
                        {getLoanPendingItemLabels(loanPendingItems) || 'Sin materiales'}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        Préstamo: {item.loans?.id ?? '-'}
                      </span>
                    </span>
                    <span className="truncate text-slate-600">{loanPendingItems.length}</span>
                    <span className="font-semibold text-amber-700">
                      {getLoanPendingTotal(loanPendingItems)}
                    </span>
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

          <DetailDrawer isOpen={Boolean(selectedItem)} onClose={closeItem}>
            {selectedItem && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Préstamo pendiente
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedLoanPendingItems.length} ítem(s) pendiente(s) | Préstamo: {selectedItem.loans?.id ?? '-'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                        selectedItem.loans?.status
                      )}`}
                    >
                      {formatLoanStatus(selectedItem.loans?.status)}
                    </span>
                    <button
                      type="button"
                      onClick={closeItem}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
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

                <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm sm:grid-cols-4">
                  <p><span className="block text-xs text-slate-500">Ítems pendientes</span>{selectedLoanPendingItems.length}</p>
                  <p><span className="block text-xs text-slate-500">Total pendiente</span>{selectedLoanPendingTotal}</p>
                  <p><span className="block text-xs text-slate-500">Entrega</span>{selectedItem.loans?.delivery_date ? formatDateTime(selectedItem.loans.delivery_date) : '-'}</p>
                  <p><span className="block text-xs text-slate-500">Estado</span>{formatLoanStatus(selectedItem.loans?.status)}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 font-medium text-slate-800">Materiales pendientes</p>
                  <div className="space-y-2">
                    {selectedLoanPendingItems.map((loanItem) => (
                      <div
                        key={loanItem.id}
                        className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_120px_110px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">
                            {loanItem.items?.name ?? 'Ítem'}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {loanItem.items?.code ?? '-'}
                            {getUnitCode(loanItem) !== '-' ? ` | Unidad: ${getUnitCode(loanItem)}` : ''}
                          </p>
                        </div>
                        <p className="text-slate-600">
                          <span className="block text-xs text-slate-500">Prestado</span>
                          {loanItem.quantity}
                        </p>
                        <p className="font-semibold text-amber-700">
                          <span className="block text-xs text-slate-500">Pendiente</span>
                          {getPending(loanItem)}
                        </p>
                      </div>
                    ))}
                  </div>
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

                {selectedItem.loans?.id && selectedLoanPendingTotal > 0 && (
                  <FullReturnForm
                    loanId={selectedItem.loans.id}
                    pendingItems={selectedLoanPendingItems}
                    pendingTotal={selectedLoanPendingTotal}
                  />
                )}

                <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  Usa la devolución completa solo cuando todo lo pendiente volvió en buen estado. Para daños o faltantes, selecciona el ítem en el formulario superior.
                </p>
              </div>
            )}
          </DetailDrawer>
        </>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          No hay préstamos pendientes que coincidan con los filtros.
        </p>
      )}
    </section>
  )
}
