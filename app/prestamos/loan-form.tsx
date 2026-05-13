'use client'

import { useMemo, useState } from 'react'
import { createLoan } from './actions'

type Item = {
  id: string
  name: string
  code: string
  stock_available: number
}

type User = {
  id: string
  full_name: string
  role: string
}

export function LoanForm({
  users,
  items,
}: {
  users: User[]
  items: Item[]
}) {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState(1)

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId),
    [items, selectedItemId]
  )

  const stock = selectedItem?.stock_available ?? 0
  const exceedsStock = quantity > stock
  const canSubmit = selectedItem && quantity > 0 && !exceedsStock

  return (
    <form action={createLoan} className="grid md:grid-cols-2 gap-4">
      {/* Usuario */}
      <div>
        <label className="block text-sm font-medium mb-1">Usuario</label>
        <select
          name="user_id"
          required
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">Seleccione</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name} ({u.role})
            </option>
          ))}
        </select>
      </div>

      {/* Item */}
      <div>
        <label className="block text-sm font-medium mb-1">Item</label>
        <select
          name="item_id"
          required
          value={selectedItemId}
          onChange={(e) => {
            setSelectedItemId(e.target.value)
            setQuantity(1)
          }}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">Seleccione</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} [{item.code}]
            </option>
          ))}
        </select>
      </div>

      {/* Info del item */}
      {selectedItem && (
        <div className="md:col-span-2 bg-slate-100 p-4 rounded-lg text-sm">
          <p><b>Item:</b> {selectedItem.name}</p>
          <p><b>Código:</b> {selectedItem.code}</p>
          <p className="text-blue-600">
            <b>Stock disponible:</b> {stock}
          </p>
        </div>
      )}

      {/* Cantidad */}
      <div>
        <label className="block text-sm font-medium mb-1">Cantidad</label>
        <input
          name="quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, Number(e.target.value) || 1))
          }
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      {/* Validación */}
      {selectedItem && (
        <div className="md:col-span-2 text-sm">
          <p>Cantidad solicitada: {quantity}</p>
          <p
            className={
              exceedsStock ? 'text-red-600' : 'text-green-600'
            }
          >
            {exceedsStock
              ? 'Excede el stock disponible'
              : 'Cantidad válida'}
          </p>
        </div>
      )}

      {/* Fecha */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Fecha esperada de devolución
        </label>
        <input
          name="expected_return_date"
          type="date"
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      {/* Notas */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1">Notas</label>
        <textarea
          name="notes"
          rows={3}
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      {/* Submit */}
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:opacity-50"
        >
          Guardar préstamo
        </button>
      </div>
    </form>
  )
}