'use client'

import { useMemo, useState } from 'react'
import { DetailDrawer } from '@/components/detail-drawer'
import { formatDateTime } from '@/lib/format-date'
import { USER_HISTORY_LIMIT } from '@/lib/query-limits'
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
  unit: {
    asset_code?: string | null
    serial_code?: string | null
  } | null
}

type LoanGroup = {
  id: string
  group_name: string
  leader_name: string
  leader_email: string
  loan_group_items: Array<{
    id: string
    quantity: number
    item: {
      id?: string
      name?: string
      code?: string
    } | null
  }>
}

type LoanRow = {
  id: string
  delivery_date: string
  expected_return_date: string | null
  returned_at: string | null
  status: string
  notes: string | null
  borrower_name: string
  borrower_email: string
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
    const term = search.trim().toLowerCase()

    return loans.filter((loan) => {
      const matchesStatus = statusFilter ? loan.status === statusFilter : true
      const itemsText = [
        ...loan.loan_items.map((li) =>
          `${li.item?.name ?? ''} ${li.item?.code ?? ''} ${li.unit?.asset_code ?? ''} ${li.unit?.serial_code ?? ''}`
        ),
        ...loan.loan_groups.flatMap((group) =>
          group.loan_group_items.map((gi) => `${gi.item?.name ?? ''} ${gi.item?.code ?? ''}`)
        ),
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !term ||
        loan.borrower_name.toLowerCase().includes(term) ||
        loan.borrower_email.toLowerCase().includes(term) ||
        loan.notes?.toLowerCase().includes(term) ||
        itemsText.includes(term)

      return matchesStatus && matchesSearch
    })
  }, [loans, search, statusFilter])

  const selectedLoan = selectedLoanId
    ? filteredLoans.find((loan) => loan.id === selectedLoanId) ?? null
    : null

  function openLoan(loanId: string) {
    setSelectedLoanId(loanId)
  }

  function closeLoan() {
    setSelectedLoanId(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="Buscar por usuario, correo, ítem, código o unidad patrimonial"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="partial_return">Devolución parcial</option>
            <option value="overdue">Vencido</option>
            <option value="returned">Devuelto</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <div className="flex items-center text-sm text-slate-600">
            Resultados: {filteredLoans.length} de los últimos {USER_HISTORY_LIMIT} préstamos
          </div>
        </div>
      </div>

      {filteredLoans.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-2xl bg-white shadow">
            <div className="hidden grid-cols-[128px_minmax(0,1.2fr)_112px_minmax(0,1fr)_112px_124px] gap-3 bg-slate-100 px-4 py-3 text-xs font-medium uppercase text-slate-500 md:grid">
              <span>Entrega</span>
              <span>Usuario</span>
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
                    onClick={() => openLoan(loan.id)}
                    className={`grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[128px_minmax(0,1.2fr)_112px_minmax(0,1fr)_112px_124px] md:items-center md:gap-3 ${
                      selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-slate-500">
                      {loan.delivery_date ? formatDateTime(loan.delivery_date) : '-'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {loan.borrower_name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {loan.borrower_email}
                      </span>
                    </span>
                    <span className="font-medium text-slate-700">
                      {getLoanType(loan)}
                    </span>
                    <span className="min-w-0 truncate text-slate-700">
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

          <DetailDrawer isOpen={Boolean(selectedLoan)} onClose={closeLoan}>
            {selectedLoan && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">
                      Entrega: {selectedLoan.delivery_date ? formatDateTime(selectedLoan.delivery_date) : '-'}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{selectedLoan.borrower_name}</h3>
                    <p className="text-sm text-slate-600">{selectedLoan.borrower_email}</p>
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
                      onClick={closeLoan}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-slate-700">Tipo</p>
                    <p className="mt-1 text-slate-600">{getLoanType(selectedLoan)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Devolución esperada</p>
                    <p className="mt-1 text-slate-600">{selectedLoan.expected_return_date || '-'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Devuelto</p>
                    <p className="mt-1 text-slate-600">
                      {selectedLoan.returned_at ? formatDateTime(selectedLoan.returned_at) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Pendiente total</p>
                    <p className="mt-1 text-slate-600">{getPendingCount(selectedLoan)}</p>
                  </div>
                </div>

                {selectedLoan.notes && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-medium">Notas:</span> {selectedLoan.notes}
                  </p>
                )}

                <div className="border-t border-slate-200 pt-4">
                  <p className="mb-3 font-medium">Materiales prestados</p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {selectedLoan.loan_items.length > 0 ? (
                      selectedLoan.loan_items.map((loanItem) => (
                        <li key={loanItem.id} className="rounded-lg bg-slate-50 px-3 py-2">
                          <span className="font-medium text-slate-800">
                            {loanItem.item?.name ?? 'Ítem'}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {loanItem.item?.code ?? '-'} | Unidad: {loanItem.unit?.asset_code || loanItem.unit?.serial_code || '-'}
                          </span>
                          <span className="mt-1 grid grid-cols-4 gap-2 text-xs">
                            <span>Cant.: {loanItem.quantity}</span>
                            <span>Dev.: {loanItem.returned_quantity}</span>
                            <span>Falt.: {loanItem.missing_quantity}</span>
                            <span>Pend.: {loanItem.pending}</span>
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="rounded-lg bg-slate-50 px-3 py-2 text-slate-500">
                        No hay materiales registrados para este préstamo.
                      </li>
                    )}
                  </ul>
                </div>

                {selectedLoan.loan_groups.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <p className="mb-3 font-medium">Distribución por grupos</p>
                    <div className="space-y-3">
                      {selectedLoan.loan_groups.map((group) => (
                        <div key={group.id} className="rounded-lg bg-slate-50 p-3">
                          <p className="text-sm font-medium">{group.group_name}</p>
                          <p className="text-xs text-slate-500">
                            Jefe de grupo: {group.leader_name} | {group.leader_email}
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-600">
                            {group.loan_group_items.map((groupItem) => (
                              <li key={groupItem.id}>
                                {groupItem.item?.name ?? 'Ítem'} [{groupItem.item?.code ?? '-'}] - {groupItem.quantity}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DetailDrawer>
        </>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-slate-500">No hay préstamos que coincidan con los filtros.</p>
        </div>
      )}
    </div>
  )
}
