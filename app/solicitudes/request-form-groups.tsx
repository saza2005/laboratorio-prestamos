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
  search: string
  category: string
}

const RESULTS_LIMIT = 8
const subscribeToHydration = () => () => {}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function formatAssetCodes(codes: string[]) {
  if (codes.length === 0) return null
  if (codes.length <= 2) return codes.join(', ')
  return `${codes.slice(0, 2).join(', ')} +${codes.length - 2}`
}

function makeGroup(index: number): Group {
  return {
    group_name: `Grupo ${index + 1}`,
    leader_student_id: '',
    items: [],
    search: '',
    category: '',
  }
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
  const [groups, setGroups] = useState<Group[]>([makeGroup(0)])
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

  const selectedLeaderIds = groups
    .map((group) => group.leader_student_id)
    .filter(Boolean)

  const hasDuplicateLeaders =
    new Set(selectedLeaderIds).size !== selectedLeaderIds.length

  const totalsByItem = useMemo(() => {
    return groups.reduce((acc, group) => {
      for (const item of group.items) {
        if (!item.item_id) continue
        acc.set(item.item_id, (acc.get(item.item_id) ?? 0) + item.quantity)
      }

      return acc
    }, new Map<string, number>())
  }, [groups])

  const hasErrors =
    hasDuplicateLeaders ||
    groups.some((group) => {
      if (!group.leader_student_id || group.items.length === 0) return true

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

  function getFilteredItems(group: Group) {
    const query = normalize(group.search)
    const selectedIds = group.items.map((item) => item.item_id)

    return items.filter((item) => {
      const matchesCategory = !group.category || item.category === group.category
      const matchesSearch =
        !query ||
        normalize(item.name).includes(query) ||
        normalize(item.code).includes(query) ||
        item.asset_codes.some((code) => normalize(code).includes(query)) ||
        normalize(item.category).includes(query)

      return (
        matchesCategory &&
        matchesSearch &&
        item.stock_available > 0 &&
        !selectedIds.includes(item.id)
      )
    })
  }

  function addGroup() {
    setGroups((prev) => [...prev, makeGroup(prev.length)])
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
    field: keyof Pick<Group, 'leader_student_id' | 'search' | 'category'>,
    value: string
  ) {
    setGroups((prev) =>
      prev.map((group, currentIndex) =>
        currentIndex === index ? { ...group, [field]: value } : group
      )
    )
  }

  function addItem(groupIndex: number, item: ItemOption) {
    setGroups((prev) =>
      prev.map((group, currentIndex) => {
        if (currentIndex !== groupIndex) return group
        if (group.items.some((groupItem) => groupItem.item_id === item.id)) {
          return group
        }

        return {
          ...group,
          search: '',
          items: [...group.items, { item_id: item.id, quantity: 1 }],
        }
      })
    )
  }

  function updateItemQuantity(
    groupIndex: number,
    itemId: string,
    value: string
  ) {
    setGroups((prev) =>
      prev.map((group, currentIndex) =>
        currentIndex === groupIndex
          ? {
              ...group,
              items: group.items.map((item) =>
                item.item_id === itemId
                  ? { ...item, quantity: Number(value) || 1 }
                  : item
              ),
            }
          : group
      )
    )
  }

  function removeItem(groupIndex: number, itemId: string) {
    setGroups((prev) =>
      prev.map((group, currentIndex) =>
        currentIndex === groupIndex
          ? {
              ...group,
              items: group.items.filter((item) => item.item_id !== itemId),
            }
          : group
      )
    )
  }

  function clearGroupFilters(groupIndex: number) {
    setGroups((prev) =>
      prev.map((group, currentIndex) =>
        currentIndex === groupIndex
          ? { ...group, search: '', category: '' }
          : group
      )
    )
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

      {groups.map((group, groupIndex) => {
        const filteredItems = getFilteredItems(group)
        const visibleItems = filteredItems.slice(0, RESULTS_LIMIT)
        const selectedItems = group.items
          .map((groupItem) => ({ groupItem, item: itemMap.get(groupItem.item_id) }))
          .filter(
            (entry): entry is { groupItem: GroupItem; item: ItemOption } =>
              Boolean(entry.item)
          )
        const duplicateLeader =
          group.leader_student_id &&
          selectedLeaderIds.filter((id) => id === group.leader_student_id).length > 1

        return (
          <div key={groupIndex} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="hidden"
              name={`groups[${groupIndex}][group_name]`}
              value={group.group_name}
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold">{group.group_name}</h3>
              <button
                type="button"
                onClick={() => removeGroup(groupIndex)}
                disabled={groups.length === 1}
                className="w-full rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Quitar grupo
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">Jefe de grupo</label>
              <select
                value={group.leader_student_id}
                onChange={(event) =>
                  updateGroup(groupIndex, 'leader_student_id', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Seleccionar jefe de grupo</option>
                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                    disabled={
                      selectedLeaderIds.includes(student.id) &&
                      group.leader_student_id !== student.id
                    }
                  >
                    {student.full_name}
                  </option>
                ))}
              </select>
              <input
                type="hidden"
                name={`groups[${groupIndex}][leader_student_id]`}
                value={group.leader_student_id}
              />
              {duplicateLeader && (
                <p className="mt-2 text-sm text-red-600">
                  Este jefe de grupo ya fue seleccionado en otro grupo.
                </p>
              )}
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)_auto]">
                <input
                  type="search"
                  value={group.search}
                  onChange={(event) =>
                    updateGroup(groupIndex, 'search', event.target.value)
                  }
                  placeholder="Buscar por nombre, código interno, código patrimonial o categoría"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <select
                  value={group.category}
                  onChange={(event) =>
                    updateGroup(groupIndex, 'category', event.target.value)
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => clearGroupFilters(groupIndex)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm transition hover:bg-slate-50"
                >
                  Limpiar
                </button>
              </div>

              <p className="text-sm text-slate-500">
                Coincidencias disponibles: {filteredItems.length} de {items.length}.
                {filteredItems.length > RESULTS_LIMIT
                  ? ` Mostrando ${RESULTS_LIMIT}; afine la búsqueda para ver otras.`
                  : ''}
              </p>

              {visibleItems.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {visibleItems.map((item) => {
                    const assetCodes = formatAssetCodes(item.asset_codes)

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addItem(groupIndex, item)}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <span className="block font-medium text-slate-900">
                          {item.name}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          Código interno: {item.code}
                          {assetCodes ? ` | Patrimonial: ${assetCodes}` : ''}
                        </span>
                        <span className="mt-1 block text-xs text-slate-600">
                          Stock: {item.stock_available} | Categoría:{' '}
                          {item.category || 'Sin categoría'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                  No hay ítems disponibles que coincidan con la búsqueda.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">Ítems de {group.group_name}</p>
                <p className="text-sm text-slate-500">Total: {selectedItems.length}</p>
              </div>

              {selectedItems.length > 0 ? (
                <div className="space-y-3">
                  {selectedItems.map(({ groupItem, item }, itemIndex) => {
                    const totalRequestedForItem =
                      totalsByItem.get(groupItem.item_id) ?? 0
                    const exceedsStock = totalRequestedForItem > item.stock_available
                    const assetCodes = formatAssetCodes(item.asset_codes)

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end">
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Código interno: {item.code}
                              {assetCodes ? ` | Patrimonial: ${assetCodes}` : ''}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              Disponible: {item.stock_available} | Total solicitado:{' '}
                              {totalRequestedForItem}
                            </p>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium">
                              Cantidad
                            </label>
                            <input
                              type="number"
                              value={groupItem.quantity}
                              min={1}
                              step={1}
                              max={item.stock_available}
                              onChange={(event) =>
                                updateItemQuantity(
                                  groupIndex,
                                  item.id,
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(groupIndex, item.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 transition hover:bg-red-100"
                          >
                            Quitar
                          </button>
                        </div>

                        <input
                          type="hidden"
                          name={`groups[${groupIndex}][items][${itemIndex}][item_id]`}
                          value={item.id}
                        />
                        <input
                          type="hidden"
                          name={`groups[${groupIndex}][items][${itemIndex}][quantity]`}
                          value={groupItem.quantity}
                        />

                        {exceedsStock && (
                          <p className="mt-2 text-sm text-red-600">
                            La cantidad total solicitada supera el stock disponible.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                  Busca un ítem y selecciónalo para agregarlo a este grupo.
                </p>
              )}
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addGroup}
        className="w-full rounded bg-blue-100 px-3 py-2 text-blue-800 transition hover:bg-blue-200 sm:w-auto"
      >
        + agregar grupo
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium">Resumen de solicitud grupal</p>
        {groups.some((group) => group.items.length > 0) ? (
          <div className="space-y-3 text-sm">
            {groups.map((group, groupIndex) => {
              const leader = students.find(
                (student) => student.id === group.leader_student_id
              )

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
                          {item.name} [{item.code}] - Cantidad:{' '}
                          {groupItem.quantity}
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

        {hasErrors && (
          <p className="mt-2 text-sm text-slate-500">
            Selecciona jefe de grupo, agrega al menos un ítem por grupo y verifica el stock disponible.
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
