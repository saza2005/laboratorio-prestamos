'use client'

import { useActionState, useMemo, useState } from 'react'
import { useConfirmSubmit } from '@/components/confirm-submit'
import { createReturnWithState } from '@/app/devoluciones/actions'

type LoanItemOption = {
  id: string
  quantity: number
  returned_quantity: number
  damaged_quantity: number
  missing_quantity: number | null
  item_units: {
    asset_code?: string
    serial_code?: string
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
  } | null
  loan_user: {
    user_id?: string
    profiles?: {
      full_name?: string
      email?: string
    } | null
  } | null
}

type ReturnFormProps = {
  loanItems: LoanItemOption[]
}

export function ReturnForm({ loanItems }: ReturnFormProps) {
  const [state, formAction, isPending] = useActionState(createReturnWithState, {
    error: null,
  })
  const [selectedId, setSelectedId] = useState('')
  const [quantityOk, setQuantityOk] = useState(0)
  const [quantityDamaged, setQuantityDamaged] = useState(0)
  const [quantityMissing, setQuantityMissing] = useState(0)
  const confirmSubmit = useConfirmSubmit({
    title: 'Registrar devolución',
    message: 'Confirma que deseas registrar esta devolución.',
    confirmLabel: 'Registrar',
  })

  const selectedLoanItem = useMemo(
    () => loanItems.find((li) => li.id === selectedId),
    [loanItems, selectedId]
  )

  const pendienteActual = selectedLoanItem
    ? selectedLoanItem.quantity -
      selectedLoanItem.returned_quantity -
      (selectedLoanItem.missing_quantity ?? 0)
    : 0

  const totalProcesado = quantityOk + quantityDamaged + quantityMissing
  const pendienteFinal = pendienteActual - totalProcesado
  const excedePendiente = totalProcesado > pendienteActual
  const isIndividualUnit = Boolean(selectedLoanItem?.item_units)

  function setIndividualResult(result: 'ok' | 'damaged' | 'missing') {
    setQuantityOk(result === 'ok' ? 1 : 0)
    setQuantityDamaged(result === 'damaged' ? 1 : 0)
    setQuantityMissing(result === 'missing' ? 1 : 0)
  }

  return (
    <form
      action={formAction}
      className="grid md:grid-cols-2 gap-4"
      onSubmit={confirmSubmit.onSubmit}
    >
      {confirmSubmit.dialog}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1">
          Ítem prestado
        </label>

        <select
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value)
            setQuantityOk(0)
            setQuantityDamaged(0)
            setQuantityMissing(0)
          }}
          disabled={isPending || loanItems.length === 0}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="">Seleccione</option>
          {loanItems.map((li) => {
            const itemData = li.items
            const borrower = li.loan_user?.profiles?.full_name ?? 'Sin nombre'
            const pendiente =
              li.quantity -
              li.returned_quantity -
              (li.missing_quantity ?? 0)

            return (
              <option key={li.id} value={li.id}>
                {itemData?.name ?? '-'} [{itemData?.code ?? '-'}]
                {li.item_units?.asset_code || li.item_units?.serial_code
                  ? ` | Unidad: ${li.item_units.asset_code || li.item_units.serial_code}`
                  : ''}
                {' '}| Usuario: {borrower} | Pendiente: {pendiente}
              </option>
            )
          })}
        </select>

        <input type="hidden" name="loan_item_id" value={selectedId} />
      </div>

      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {selectedLoanItem ? (
          <>
            <h3 className="font-semibold text-slate-800 mb-2">
              Resumen del ítem seleccionado
            </h3>

            <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-700">
            <p>
              <span className="font-medium">Ítem:</span>{' '}
              {selectedLoanItem.items?.name ?? '-'} [{selectedLoanItem.items?.code ?? '-'}]
            </p>
            <p>
              <span className="font-medium">Usuario:</span>{' '}
              {selectedLoanItem.loan_user?.profiles?.full_name ?? '-'}
            </p>
            {(selectedLoanItem.item_units?.asset_code || selectedLoanItem.item_units?.serial_code) && (
              <p>
                <span className="font-medium">Unidad patrimonial:</span>{' '}
                {selectedLoanItem.item_units.asset_code || selectedLoanItem.item_units.serial_code}
              </p>
            )}
            <p>
              <span className="font-medium">Cantidad prestada:</span>{' '}
              {selectedLoanItem.quantity}
            </p>
            <p>
              <span className="font-medium">Devuelto acumulado:</span>{' '}
              {selectedLoanItem.returned_quantity}
            </p>
            <p>
              <span className="font-medium">Dañado acumulado:</span>{' '}
              {selectedLoanItem.damaged_quantity}
            </p>
            <p>
              <span className="font-medium">Faltante acumulado:</span>{' '}
              {selectedLoanItem.missing_quantity ?? 0}
            </p>
            <p className="md:col-span-2 text-blue-700 font-semibold">
              Pendiente actual: {pendienteActual}
            </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setQuantityOk(pendienteActual)
                setQuantityDamaged(0)
                setQuantityMissing(0)
              }}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 transition"
            >
              Completar todo como OK
            </button>

            <button
              type="button"
              onClick={() => {
                setQuantityOk(0)
                setQuantityDamaged(0)
                setQuantityMissing(0)
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              Limpiar cantidades
            </button>
            </div>
          </>
        ) : (
          <div className="py-2 text-sm text-slate-600">
            <h3 className="font-semibold text-slate-800">
              Resumen del ítem
            </h3>
            <p className="mt-1">
              Selecciona un ítem prestado para consultar su detalle y registrar
              las cantidades de la devolución.
            </p>
          </div>
        )}
      </div>

      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-slate-800">
          Cantidades de la devolución
        </h3>

        {!selectedLoanItem ? (
          <p className="text-sm text-slate-600">
            Las opciones se habilitarán después de seleccionar un ítem.
          </p>
        ) : isIndividualUnit ? (
          <fieldset>
            <legend className="mb-2 block text-sm font-medium">
              Estado de la unidad recibida
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { value: 'ok', label: 'Buen estado' },
                { value: 'damaged', label: 'Dañada' },
                { value: 'missing', label: 'Faltante' },
              ].map((option) => {
                const checked =
                  (option.value === 'ok' && quantityOk === 1) ||
                  (option.value === 'damaged' && quantityDamaged === 1) ||
                  (option.value === 'missing' && quantityMissing === 1)

                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm transition hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      name="individual_result"
                      value={option.value}
                      checked={checked}
                      onChange={() =>
                        setIndividualResult(
                          option.value as 'ok' | 'damaged' | 'missing'
                        )
                      }
                    />
                    {option.label}
                  </label>
                )
              })}
            </div>
            <input type="hidden" name="quantity_ok" value={quantityOk} />
            <input
              type="hidden"
              name="quantity_damaged"
              value={quantityDamaged}
            />
            <input
              type="hidden"
              name="quantity_missing"
              value={quantityMissing}
            />
          </fieldset>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">
                Cantidad en buen estado
              </label>
              <input
                name="quantity_ok"
                type="number"
                min="0"
                max={pendienteActual}
                step="1"
                value={quantityOk}
                onChange={(e) =>
                  setQuantityOk(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Cantidad dañada
              </label>
              <input
                name="quantity_damaged"
                type="number"
                min="0"
                max={pendienteActual}
                step="1"
                value={quantityDamaged}
                onChange={(e) =>
                  setQuantityDamaged(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Cantidad faltante
              </label>
              <input
                name="quantity_missing"
                type="number"
                min="0"
                max={pendienteActual}
                step="1"
                value={quantityMissing}
                onChange={(e) =>
                  setQuantityMissing(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
        )}
      </div>

      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <h3 className="font-semibold text-slate-800 mb-2">
          Resumen de esta devolución
        </h3>

        <div className="grid md:grid-cols-2 gap-2 text-slate-700">
          <p>
            <span className="font-medium">Total procesado:</span> {totalProcesado}
          </p>
          <p>
            <span className="font-medium">Pendiente final estimado:</span>{' '}
            <span className={excedePendiente ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>
              {selectedLoanItem ? pendienteFinal : 0}
            </span>
          </p>
        </div>

        {excedePendiente && (
          <p className="mt-2 text-sm text-red-600 font-medium">
            La suma de cantidades excede el pendiente actual del préstamo.
          </p>
        )}
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1">Notas</label>
        <textarea
          name="notes"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={
            !selectedLoanItem ||
            totalProcesado <= 0 ||
            !Number.isInteger(totalProcesado) ||
            excedePendiente ||
            isPending
          }
          className="rounded-lg bg-green-600 text-white px-5 py-2.5 font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Registrando...' : 'Registrar devolución'}
        </button>

        {loanItems.length === 0 && (
          <p className="mt-2 text-sm text-slate-600">
            No hay préstamos pendientes disponibles para devolución.
          </p>
        )}

        {state.error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
      </div>
    </form>
  )
}
