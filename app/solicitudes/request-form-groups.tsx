'use client'

import { useActionState, useMemo, useState, useSyncExternalStore } from 'react'
import { createRequestWithState } from './actions'

type ItemOption = {
  id: string
  name: string
  code: string
  stock_available: number
  category: string | null
  asset_codes: string[]
}

type Student = {
  id: string
  full_name: string
}

type GroupItem = {
  item_id: string
  quantity: number
}

type Group = {
  group_name: string
  leader_student_id: string
  items: GroupItem[]
}

const SELECT_OPTIONS_LIMIT = 100
const subscribeToHydration = () => () => {}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function RequestFormGroups({
  items,
  students,
  minScheduledReturnDate,
}: {
  items: ItemOption[]
  students: Student[]
  minScheduledReturnDate: string
}) {
  const [state, formAction, isPending] = useActionState(createRequestWithState, {
    error: null,
  })
  const [groups, setGroups] = useState<Group[]>([
    {
      group_name: 'Grupo 1',
      leader_student_id: '',
      items: [{ item_id: '', quantity: 1 }],
    },
  ])
  const [itemSearch, setItemSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  )

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
        item.asset_codes.some((code) => normalize(code).includes(query)) ||
        normalize(item.category).includes(query)

      return matchesCategory && matchesSearch
    })
  }, [categoryFilter, itemSearch, items])

  const visibleItems = filteredItems.slice(0, SELECT_OPTIONS_LIMIT)

  const selectedLeaderIds = groups
    .map((group) => group.leader_student_id)
    .filter(Boolean)

  const hasDuplicateLeaders = new Set(selectedLeaderIds).size !== selectedLeaderIds.length

  const totalsByItem = useMemo(() => {
    return groups.reduce((acc, group) => {
      for (const item of group.items) {
        if (!item.item_id) continue
        acc.set(item.item_id, (acc.get(item.item_id) ?? 0) + item.quantity)
      }

      return acc
    }, new Map<string, number>())
  }, [groups])

  const hasErrors = hasDuplicateLeaders || groups.some((group) => {
    if (!group.leader_student_id) return true

    return group.items.some((groupItem) => {
      const item = itemMap.get(groupItem.item_id)
      const totalRequestedForItem = groupItem.item_id
        ? totalsByItem.get(groupItem.item_id) ?? 0
        : 0

      return (
        !groupItem.item_id ||
        !Number.isInteger(groupItem.quantity) ||
        groupItem.quantity < 1 ||
        !item ||
        totalRequestedForItem > item.stock_available
      )
    })
  })

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      {
        group_name: `Grupo ${prev.length + 1}`,
        leader_student_id: '',
        items: [{ item_id: '', quantity: 1 }],
      },
    ])
  }

  function removeGroup(groupIndex: number) {
    setGroups((prev) => {
      if (prev.length === 1) return prev

      return prev
        .filter((_, index) => index !== groupIndex)
        .map((group, index) => ({
          ...group,
          group_name: `Grupo ${index + 1}`,
        }))
    })
  }

  function updateGroup(
    index: number,
    field: keyof Pick<Group, 'group_name' | 'leader_student_id'>,
    value: string
  ) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === index ? { ...g, [field]: value } : g
      )
    )
  }
  function updateItem(
    groupIndex: number,
    itemIndex: number,
    field: keyof GroupItem,
    value: string | number
  ) {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIndex) return g

        const newItems = g.items.map((it, j) =>
          j === itemIndex
            ? {
                ...it,
                [field]: field === 'quantity' ? Number(value) || 1 : value,
              }
            : it
        )

        return { ...g, items: newItems }
      })
    )
  }

  function addItem(groupIndex: number) {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? { ...g, items: [...g.items, { item_id: '', quantity: 1 }] }
          : g
      )
    )
  }

  function removeItem(groupIndex: number, itemIndex: number) {
    setGroups((prev) =>
      prev.map((group, index) => {
        if (index !== groupIndex || group.items.length === 1) return group

        return {
          ...group,
          items: group.items.filter((_, currentIndex) => currentIndex !== itemIndex),
        }
      })
    )
  }

  function getSelectableItems(selectedItemId: string) {
    if (!selectedItemId || visibleItems.some((item) => item.id === selectedItemId)) {
      return visibleItems
    }

    const selectedItem = itemMap.get(selectedItemId)
    return selectedItem ? [selectedItem, ...visibleItems] : visibleItems
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Propósito</label>
          <input
            name="purpose"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Práctica de laboratorio / clase / proyecto"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Fecha estimada de devolución
          </label>
          <input
            name="scheduled_return_date"
            type="date"
            min={minScheduledReturnDate}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Comentarios</label>
          <textarea
            name="comments"
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Detalle adicional de la solicitud grupal"
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)]">
        <input
          type="search"
          value={itemSearch}
          onChange={(event) => setItemSearch(event.target.value)}
          placeholder="Buscar ítem por nombre, código interno, código patrimonial o categoría"
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
          Coincidencias: {filteredItems.length} de {items.length}.
            {filteredItems.length > SELECT_OPTIONS_LIMIT
              ? ` Mostrando las primeras ${SELECT_OPTIONS_LIMIT}; afine la búsqueda para encontrar otras.`
              : ''}
        </p>
      </div>

      {groups.map((group, gIndex) => (
        <div key={gIndex} className="border p-4 rounded-xl bg-slate-50">

          <input
            type="hidden"
            name={`groups[${gIndex}][group_name]`}
            value={group.group_name}
          />

          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold">{group.group_name}</h3>
            <button
              type="button"
              onClick={() => removeGroup(gIndex)}
              disabled={groups.length === 1}
              className="w-full rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Quitar grupo
            </button>
          </div>

          <select
            value={group.leader_student_id}
            onChange={(e) =>
              updateGroup(gIndex, 'leader_student_id', e.target.value)
            }
            className="border p-2 rounded w-full mb-3"
          >
            <option value="">Seleccionar jefe de grupo</option>
            {students.map((s) => (
              <option
                key={s.id}
                value={s.id}
                disabled={selectedLeaderIds.includes(s.id) && group.leader_student_id !== s.id}
              >
                {s.full_name}
              </option>
            ))}
          </select>

          <input
            type="hidden"
            name={`groups[${gIndex}][leader_student_id]`}
            value={group.leader_student_id}
          />

          {group.items.map((item, iIndex) => {
            const selectableItems = getSelectableItems(item.item_id)

            return (
            <div key={iIndex} className="grid gap-2 mb-2 md:grid-cols-[minmax(0,1fr)_96px_auto]">

              <select
                value={item.item_id}
                onChange={(e) =>
                  updateItem(gIndex, iIndex, 'item_id', e.target.value)
                }
                className="border p-2 rounded w-full"
              >
                <option value="">Seleccione equipo</option>
                {selectableItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} [{it.code}] - Stock: {it.stock_available}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={item.quantity}
                min={1}
                step={1}
                max={
                  item.item_id
                    ? itemMap.get(item.item_id)?.stock_available
                    : undefined
                }
                onChange={(e) =>
                  updateItem(gIndex, iIndex, 'quantity', e.target.value)
                }
                className="border p-2 rounded w-full"
              />

              <button
                type="button"
                onClick={() => removeItem(gIndex, iIndex)}
                disabled={group.items.length === 1}
                className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Quitar
              </button>

              <input
                type="hidden"
                name={`groups[${gIndex}][items][${iIndex}][item_id]`}
                value={item.item_id}
              />

              <input
                type="hidden"
                name={`groups[${gIndex}][items][${iIndex}][quantity]`}
                value={item.quantity}
              />

            </div>
            )
          })}

          {group.items.some((groupItem) => {
            const selectedItem = itemMap.get(groupItem.item_id)
            const totalRequestedForItem = groupItem.item_id
              ? totalsByItem.get(groupItem.item_id) ?? 0
              : 0

            return selectedItem && totalRequestedForItem > selectedItem.stock_available
          }) && (
            <p className="text-sm text-red-600">
              La cantidad total solicitada supera el stock disponible.
            </p>
          )}

          {group.leader_student_id &&
            selectedLeaderIds.filter((id) => id === group.leader_student_id).length > 1 && (
              <p className="text-sm text-red-600">
                Este jefe de grupo ya fue seleccionado en otro grupo.
              </p>
            )}

          <button
            type="button"
            onClick={() => addItem(gIndex)}
            className="text-blue-600 text-sm"
          >
            + agregar ítem
          </button>

        </div>
      ))}

      <button
        type="button"
        onClick={addGroup}
        className="w-full rounded bg-blue-100 px-3 py-2 text-blue-800 transition hover:bg-blue-200 sm:w-auto"
      >
        + agregar grupo
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium mb-2">Resumen de solicitud grupal</p>
        {groups.some((group) => group.items.some((item) => item.item_id)) ? (
          <div className="space-y-3 text-sm">
            {groups.map((group, groupIndex) => {
              const leader = students.find((student) => student.id === group.leader_student_id)

              return (
                <div key={groupIndex}>
                  <p className="font-medium">
                    {group.group_name}: {leader?.full_name ?? 'Sin jefe seleccionado'}
                  </p>
                  <ul className="mt-1 space-y-1 text-slate-600">
                    {group.items.map((groupItem, itemIndex) => {
                      const item = itemMap.get(groupItem.item_id)

                      if (!item) return null

                      return (
                        <li key={itemIndex}>
                          {item.name} [{item.code}] - Cantidad: {groupItem.quantity}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Aún no has seleccionado ítems para los grupos.
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          suppressHydrationWarning
          disabled={!mounted || hasErrors || isPending}
          className="w-full rounded bg-blue-600 px-5 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isPending ? 'Enviando...' : 'Enviar solicitud con grupos'}
        </button>

        {state.error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
      </div>
    </form>
  )
}