'use client'

import { useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import { formatDateTime } from '@/lib/format-date'
import { normalizeSearchText } from '@/lib/item-format'
import { formatLoanStatus, loanStatusBadgeClass } from '@/lib/status-format'

type LoanItem = {
  id: string
  quantity: number
  returned_quantity: number
  damaged_quantity: number
  missing_quantity: number
  pending: number
  item: {
    id?: string
    name?: string
    code?: string
  } | null
}

type LoanGroupItem = {
  quantity: number
  item: {
    name?: string
    code?: string
  } | null
}

type LoanGroup = {
  id: string
  group_name: string
  leader: {
    full_name?: string
  } | null
  loan_group_items: LoanGroupItem[]
}

type LoanRow = {
  id: string
  status: string
  delivery_date: string
  expected_return_date: string | null
  returned_at: string | null
  loan_items: LoanItem[]
  loan_groups: LoanGroup[]
}

type LoansListProps = {
  loans: LoanRow[]
}

function getLoanType(loan: LoanRow) {
  return loan.loan_groups.length > 0 ? 'Grupal' : 'Individual'
}

function getItemCount(loan: LoanRow) {
  if (loan.loan_groups.length > 0) {
    return loan.loan_groups.reduce(
      (total, group) => total + group.loan_group_items.length,
      0
    )
  }

  return loan.loan_items.length
}

function getPendingCount(loan: LoanRow) {
  return loan.loan_items.reduce((total, item) => total + Math.max(0, item.pending), 0)
}

function getPreviewText(loan: LoanRow) {
  if (loan.loan_groups.length > 0) {
    return `${loan.loan_groups.length} grupo(s), ${getItemCount(loan)} ítem(s)`
  }

  const firstItem = loan.loan_items[0]?.item?.name
  if (!firstItem) return `${getItemCount(loan)} ítem(s)`

  return loan.loan_items.length > 1
    ? `${firstItem} +${loan.loan_items.length - 1}`
    : firstItem
}

export function LoansList({ loans }: LoansListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)

  const filteredLoans = useMemo(() => {
    const term = normalizeSearchText(search)

    return loans.filter((loan) => {
      const matchesStatus = statusFilter ? loan.status === statusFilter : true
      const itemsText = normalizeSearchText([
        ...loan.loan_items.map(
          (item) => `${item.item?.name ?? ''} ${item.item?.code ?? ''}`
        ),
        ...loan.loan_groups.flatMap((group) =>
          group.loan_group_items.map(
            (item) => `${item.item?.name ?? ''} ${item.item?.code ?? ''}`
          )
        ),
      ]
        .join(' '))
      const matchesSearch =
        !term ||
        normalizeSearchText(getLoanType(loan)).includes(term) ||
        itemsText.includes(term)

      return matchesStatus && matchesSearch
    })
  }, [loans, search, statusFilter])

  const selectedLoan = useMemo(() => {
    if (!selectedLoanId) return null
    return filteredLoans.find((loan) => loan.id === selectedLoanId) ?? null
  }, [filteredLoans, selectedLoanId])

  function clearFilters() {
    setSearch('')
    setStatusFilter('')
    setSelectedLoanId(null)
  }

  const hasFilters = Boolean(search || statusFilter)

  if (loans.length === 0) {
    return <p className="text-slate-500">No tienes préstamos registrados.</p>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_auto]">
          <input
            type="text"
            placeholder="Buscar por ítem, código o tipo"
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
            <option value="returned">Devuelto</option>
            <option value="cancelled">Cancelado</option>
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
          Resultados: {filteredLoans.length} de {loans.length}
        </p>
      </div>

      {filteredLoans.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="hidden grid-cols-[112px_116px_minmax(0,1fr)_120px_124px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
          <span>Entrega</span>
          <span>Tipo</span>
          <span>Resumen</span>
          <span>Pendiente</span>
          <span>Estado</span>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredLoans.map((loan) => {
            const selected = selectedLoan?.id === loan.id
            const pendingCount = getPendingCount(loan)

            return (
              <button
                key={loan.id}
                type="button"
                onClick={() => setSelectedLoanId(loan.id)}
                className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[112px_116px_minmax(0,1fr)_120px_124px] md:items-center md:gap-3 ${
                  selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <span className="text-slate-500">
                  {formatDateTime(loan.delivery_date)}
                </span>
                <span className="font-medium text-slate-800">
                  {getLoanType(loan)}
                </span>
                <span className="min-w-0 text-slate-700 md:truncate">
                  {getPreviewText(loan)}
                </span>
                <span className={pendingCount > 0 ? 'text-amber-700' : 'text-green-700'}>
                  {pendingCount}
                </span>
                <span>
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${loanStatusBadgeClass(
                      loan.status
                    )}`}
                  >
                    {formatLoanStatus(loan.status)}
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
            No hay préstamos que coincidan con los filtros.
          </p>
        </div>
      )}

      <DetailDrawer isOpen={Boolean(selectedLoan)} onClose={() => setSelectedLoanId(null)}>
        {selectedLoan && (
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">
                  Entregado: {formatDateTime(selectedLoan.delivery_date)}
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  Préstamo {getLoanType(selectedLoan).toLowerCase()}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${loanStatusBadgeClass(
                    selectedLoan.status
                  )}`}
                >
                  {formatLoanStatus(selectedLoan.status)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLoanId(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-slate-700">Devolución esperada</p>
                <p className="mt-1 text-slate-600">
                  {selectedLoan.expected_return_date || '-'}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Fecha de devolución</p>
                <p className="mt-1 text-slate-600">
                  {selectedLoan.returned_at ? formatDateTime(selectedLoan.returned_at) : '-'}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Ítems</p>
                <p className="mt-1 text-slate-600">
                  {getItemCount(selectedLoan)} registrado(s)
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Pendiente total</p>
                <p className="mt-1 text-slate-600">{getPendingCount(selectedLoan)}</p>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="mb-3 font-medium">Detalle de materiales</p>

              {selectedLoan.loan_groups.length > 0 ? (
                <div className="space-y-3">
                  {selectedLoan.loan_groups.map((group) => (
                    <div key={group.id} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-sm font-medium">
                        {group.group_name} - {group.leader?.full_name ?? 'Sin asignar'}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {group.loan_group_items.map((groupItem, index) => (
                          <li key={index}>
                            {groupItem.item?.name ?? 'Ítem'} - {groupItem.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-2 text-sm text-slate-600">
                  {selectedLoan.loan_items.map((loanItem) => (
                    <li key={loanItem.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <span className="font-medium text-slate-800">
                        {loanItem.item?.name ?? 'Ítem'}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {loanItem.item?.code ?? '-'} | Cantidad: {loanItem.quantity}
                      </span>
                      <span className="mt-1 grid grid-cols-4 gap-2 text-xs text-slate-600">
                        <span>Devuelto: {loanItem.returned_quantity}</span>
                        <span>Dañado: {loanItem.damaged_quantity}</span>
                        <span>Perdido: {loanItem.missing_quantity}</span>
                        <span>Pendiente: {loanItem.pending}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {['active', 'partial_return', 'overdue'].includes(selectedLoan.status) && (
              <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Debe entregar físicamente estos materiales al laboratorio para que el personal registre la devolución.
              </p>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  )
}
