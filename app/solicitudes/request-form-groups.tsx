'use client'

import { useState } from 'react'
import { createRequest } from './actions'

type ItemOption = {
  id: string
  name: string
  code: string
  stock_available: number
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

  return (
    <form action={createRequest} className="space-y-6">

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

          {group.items.map((item, iIndex) => (
            <div key={iIndex} className="flex gap-2 mb-2">

              <select
                value={item.item_id}
                onChange={(e) =>
                  updateItem(gIndex, iIndex, 'item_id', e.target.value)
                }
                className="border p-2 rounded w-full"
              >
                <option value="">Seleccione equipo</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={item.quantity}
                min={1}
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
          ))}

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
        className="bg-blue-600 text-white px-5 py-2 rounded"
      >
        Enviar solicitud con grupos
      </button>
    </form>
  )
}