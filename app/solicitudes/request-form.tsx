'use client'

import { useActionState, useMemo, useState } from 'react'
import { createRequestWithState } from './actions'

type ItemOption = {
  id: string
  name: string
  code: string
  stock_available: number
  item_type: string | null
  category: string | null
}

type RequestRow = {
  item_id: string
  quantity_requested: number
}

type RequestFormProps = {
  items: ItemOption[]
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function RequestForm({ items }: RequestFormProps) {
  const [state, formAction, isPending] = useActionState(createRequestWithState, {
    error: null,
  })
  const [rows, setRows] = useState<RequestRow[]>([
    { item_id: '', quantity_requested: 1 },
  ])
  const [itemSearch, setItemSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const selectedIds = rows.map((row) => row.item_id).filter(Boolean)

  const itemMap = useMemo(() => {
    return new Map(items.map((item) => [item.id, item]))
  }, [items])

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        items
          .map((item) => item.category?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, 'es'))
  }, [items])

  const filteredItems = useMemo(() => {
    const query = normalize(itemSearch)

    return items.filter((item) => {
      const matchesCategory = !categoryFilter || item.category === categoryFilter
      const matchesSearch =
        !query ||
        normalize(item.name).includes(query) ||
        normalize(item.code).includes(query) ||
        normalize(item.category).includes(query)

      return matchesCategory && matchesSearch
    })
  }, [categoryFilter, itemSearch, items])

  const hasErrors = rows.some((row) => {
    const item = items.find((i) => i.id === row.item_id)

    return (
      !row.item_id ||
      row.quantity_requested < 1 ||
      (item ? row.quantity_requested > item.stock_available : true)
    )
  })

  function updateRow(
    index: number,
    field: keyof RequestRow,
    value: string | number
  ) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]:
                field === 'quantity_requested'
                  ? Number(value) || 1
                  : value,
            }
          : row
      )
    )
  }

  function addRow() {
    setRows((prev) => [...prev, { item_id: '', quantity_requested: 1 }])
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  function getSelectableItems(selectedItemId: string) {
    if (!selectedItemId || filteredItems.some((item) => item.id === selectedItemId)) {
      return filteredItems
    }

    const selectedItem = itemMap.get(selectedItemId)
    return selectedItem ? [selectedItem, ...filteredItems] : filteredItems
  }

  return (
    <form action={formAction} className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Propósito</label>
        <input
          name="purpose"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Práctica de laboratorio / clase / proyecto"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Fecha estimada de devolución
        </label>
        <input
          name="scheduled_return_date"
          type="date"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1">Comentarios</label>
        <textarea
          name="comments"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Detalle adicional de la solicitud"
        />
      </div>

      <div className="md:col-span-2">
        <h3 className="text-lg font-semibold mb-3">Ítems solicitados</h3>

        <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)]">
          <input
            type="search"
            value={itemSearch}
            onChange={(event) => setItemSearch(event.target.value)}
            placeholder="Buscar ítem por nombre, código o categoría"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <p className="text-sm text-slate-500 md:col-span-2">
            Opciones disponibles: {filteredItems.length} de {items.length}
          </p>
        </div>

        <div className="space-y-4">
          {rows.map((row, index) => {
            const selectedItem = items.find((item) => item.id === row.item_id)
            const selectableItems = getSelectableItems(row.item_id)

            return (
              <div
                key={index}
                className="rounded-xl border border-slate-200 p-4 bg-slate-50"
              >
                <div className="grid md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-7">
                    <label className="block text-sm font-medium mb-1">
                      Ítem
                    </label>

                    <select
                      value={row.item_id}
                      onChange={(e) =>
                        updateRow(index, 'item_id', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="">Seleccione</option>

                      {selectableItems.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={
                            selectedIds.includes(item.id) &&
                            row.item_id !== item.id
                          }
                        >
                          {item.name} [{item.code}] - Stock:{' '}
                          {item.stock_available}
                        </option>
                      ))}
                    </select>

                    <input type="hidden" name="item_id" value={row.item_id} />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-1">
                      Cantidad
                    </label>

                    <input
                      type="number"
                      min="1"
                      max={selectedItem?.stock_available ?? undefined}
                      value={row.quantity_requested}
                      onChange={(e) =>
                        updateRow(index, 'quantity_requested', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />

                    <input
                      type="hidden"
                      name="quantity_requested"
                      value={row.quantity_requested}
                    />
                  </div>

                  <div className="md:col-span-2">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 transition"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>

                {selectedItem && (
                  <p className="mt-2 text-sm text-slate-600">
                    Disponible:{' '}
                    <span className="font-medium">
                      {selectedItem.stock_available}
                    </span>
                  </p>
                )}

                {selectedItem &&
                  row.quantity_requested > selectedItem.stock_available && (
                    <p className="mt-1 text-sm text-red-600">
                      La cantidad excede el stock disponible.
                    </p>
                  )}
              </div>
            )
          })}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 transition"
          >
            Agregar otro ítem
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-slate-100 p-4">
          <p className="text-sm font-medium mb-2">Resumen de solicitud:</p>

          {rows.some((row) => row.item_id) ? (
            <ul className="text-sm space-y-1">
              {rows.map((row, index) => {
                const item = items.find((it) => it.id === row.item_id)

                if (!item) return null

                return (
                  <li key={index}>
                    {item.name} [{item.code}] - Cantidad:{' '}
                    {row.quantity_requested}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Aún no has seleccionado ítems.
            </p>
          )}
        </div>
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={hasErrors || isPending}
          className={`w-full rounded-lg px-5 py-2.5 font-medium transition sm:w-auto ${
            hasErrors
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isPending ? 'Enviando...' : 'Enviar solicitud'}
        </button>

        {hasErrors && (
          <p className="mt-2 text-sm text-slate-500">
            Complete correctamente los ítems y cantidades antes de enviar.
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