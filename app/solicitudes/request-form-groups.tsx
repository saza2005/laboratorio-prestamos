'use client'

import { useMemo, useState } from 'react'
import { createRequest } from './actions'

type ItemOption = {
  id: string
  name: string
  code: string
  stock_available: number
  category: string | null
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

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function RequestFormGroups({
  items,
  students,
}: {
  items: ItemOption[]
  students: Student[]
}) {
  const [groups, setGroups] = useState<Group[]>([
    {
      group_name: 'Grupo 1',
      leader_student_id: '',
      items: [{ item_id: '', quantity: 1 }],
    },
  ])
  const [itemSearch, setItemSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

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

  const totalsByItem = useMemo(() => {
    return groups.reduce((acc, group) => {
      for (const item of group.items) {
        if (!item.item_id) continue
        acc.set(item.item_id, (acc.get(item.item_id) ?? 0) + item.quantity)
      }

      return acc
    }, new Map<string, number>())
  }, [groups])

  const hasErrors = groups.some((group) => {
    if (!group.leader_student_id) return true

    return group.items.some((groupItem) => {
      const item = itemMap.get(groupItem.item_id)
      const totalRequestedForItem = groupItem.item_id
        ? totalsByItem.get(groupItem.item_id) ?? 0
        : 0

      return (
        !groupItem.item_id ||
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

  function getSelectableItems(selectedItemId: string) {
    if (!selectedItemId || filteredItems.some((item) => item.id === selectedItemId)) {
      return filteredItems
    }

    const selectedItem = itemMap.get(selectedItemId)
    return selectedItem ? [selectedItem, ...filteredItems] : filteredItems
  }

  return (
    <form action={createRequest} className="space-y-6">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)]">
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

      {groups.map((group, gIndex) => (
        <div key={gIndex} className="border p-4 rounded-xl bg-slate-50">

          <input
            type="hidden"
            name={`groups[${gIndex}][group_name]`}
            value={group.group_name}
          />

          <h3 className="font-semibold mb-2">{group.group_name}</h3>

          <select
            value={group.leader_student_id}
            onChange={(e) =>
              updateGroup(gIndex, 'leader_student_id', e.target.value)
            }
            className="border p-2 rounded w-full mb-3"
          >
            <option value="">Seleccionar jefe de grupo</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
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
            <div key={iIndex} className="flex gap-2 mb-2">

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
                max={
                  item.item_id
                    ? itemMap.get(item.item_id)?.stock_available
                    : undefined
                }
                onChange={(e) =>
                  updateItem(gIndex, iIndex, 'quantity', e.target.value)
                }
                className="border p-2 rounded w-24"
              />

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
        className="bg-blue-100 px-3 py-2 rounded"
      >
        + agregar grupo
      </button>

      <button
        type="submit"
        disabled={hasErrors}
        className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Enviar solicitud con grupos
      </button>
    </form>
  )
}