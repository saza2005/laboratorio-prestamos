'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canCreateGroupRequests, canUseRequestPortal } from '@/lib/supabase/auth/roles'

export type RequestActionState = {
  error: string | null
}

export type CancelRequestActionState = {
  error: string | null
}

function parsePositiveInt(value: FormDataEntryValue | null): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return 0
  return Math.floor(n)
}

type RequestedRow = {
  item_id: string
  quantity_requested: number
}

type GroupItemRow = {
  item_id: string
  quantity: number
}

type RequestGroupRow = {
  group_name: string
  leader_student_id: string
  items: GroupItemRow[]
}

function parseGroups(formData: FormData): RequestGroupRow[] {
  const groups: RequestGroupRow[] = []

  for (const [key, value] of formData.entries()) {
    const groupMatch = key.match(/^groups\[(\d+)\]\[(group_name|leader_student_id)\]$/)

    if (groupMatch) {
      const groupIndex = Number(groupMatch[1])
      const field = groupMatch[2] as 'group_name' | 'leader_student_id'

      if (!groups[groupIndex]) {
        groups[groupIndex] = {
          group_name: '',
          leader_student_id: '',
          items: [],
        }
      }

      groups[groupIndex][field] = String(value || '').trim()
      continue
    }

    const itemMatch = key.match(
      /^groups\[(\d+)\]\[items\]\[(\d+)\]\[(item_id|quantity)\]$/
    )

    if (itemMatch) {
      const groupIndex = Number(itemMatch[1])
      const itemIndex = Number(itemMatch[2])
      const field = itemMatch[3] as 'item_id' | 'quantity'

      if (!groups[groupIndex]) {
        groups[groupIndex] = {
          group_name: '',
          leader_student_id: '',
          items: [],
        }
      }

      if (!groups[groupIndex].items[itemIndex]) {
        groups[groupIndex].items[itemIndex] = {
          item_id: '',
          quantity: 0,
        }
      }

      if (field === 'item_id') {
        groups[groupIndex].items[itemIndex].item_id = String(value || '').trim()
      } else {
        groups[groupIndex].items[itemIndex].quantity = parsePositiveInt(value)
      }
    }
  }

  return groups
    .filter((group) => group && group.group_name && group.leader_student_id)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => item.item_id && item.quantity > 0
      ),
    }))
    .filter((group) => group.items.length > 0)
}

async function persistRequest(formData: FormData): Promise<void> {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canUseRequestPortal(profile.role)) {
    redirect('/auth/login')
  }

  const purpose = String(formData.get('purpose') || '').trim()
  const comments = String(formData.get('comments') || '').trim()
  const scheduledReturnDate = String(
    formData.get('scheduled_return_date') || ''
  ).trim()

  const groups = parseGroups(formData)

  if (groups.length > 0) {
    if (!canCreateGroupRequests(profile.role)) {
      throw new Error('Su rol no permite crear solicitudes grupales.')
    }

    const allGroupItems = groups.flatMap((group) => group.items)

    const totalsByItem = new Map<string, number>()

    for (const item of allGroupItems) {
      totalsByItem.set(
        item.item_id,
        (totalsByItem.get(item.item_id) ?? 0) + item.quantity
      )
    }

    const itemIdsToCheck = Array.from(totalsByItem.keys())

    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, status, stock_available')
      .in('id', itemIdsToCheck)

    if (itemsError || !items) {
      throw new Error('No se pudieron validar los ítems seleccionados.')
    }

    const itemMap = new Map(items.map((item) => [item.id, item]))

    for (const [itemId, totalQuantity] of totalsByItem.entries()) {
      const item = itemMap.get(itemId)

      if (!item) {
        throw new Error('Uno de los ítems seleccionados no existe.')
      }

      if (item.status !== 'active') {
        throw new Error('Uno de los ítems seleccionados no está disponible.')
      }

      if (item.stock_available < totalQuantity) {
        throw new Error(
          'La cantidad total solicitada por grupos excede el stock disponible.'
        )
      }
    }

    const leaderIds = groups.map((group) => group.leader_student_id)

    const { data: leaders, error: leadersError } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', leaderIds)

    if (leadersError || !leaders) {
      throw new Error('No se pudieron validar los jefes de grupo.')
    }

    const leaderMap = new Map(leaders.map((leader) => [leader.id, leader]))

    for (const group of groups) {
      const leader = leaderMap.get(group.leader_student_id)

      if (!leader) {
        throw new Error('Uno de los jefes de grupo no existe.')
      }

      if (leader.role !== 'student') {
        throw new Error('El jefe de grupo debe tener rol de estudiante.')
      }
    }

    const { data: newRequest, error: requestError } = await supabase
      .from('requests')
      .insert({
        user_id: user.id,
        purpose: purpose || null,
        comments: comments || null,
        scheduled_return_date: scheduledReturnDate || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (requestError || !newRequest) {
      throw new Error(requestError?.message || 'No se pudo crear la solicitud.')
    }

    const requestItemsPayload = Array.from(totalsByItem.entries()).map(
      ([itemId, quantity]) => ({
        request_id: newRequest.id,
        item_id: itemId,
        quantity_requested: quantity,
        quantity_approved: 0,
        quantity_delivered: 0,
        quantity_returned: 0,
        quantity_damaged: 0,
      })
    )

    const { error: requestItemsError } = await supabase
      .from('request_items')
      .insert(requestItemsPayload)

    if (requestItemsError) {
      throw new Error(requestItemsError.message)
    }

    for (const group of groups) {
      const { data: newGroup, error: groupError } = await supabase
        .from('request_groups')
        .insert({
          request_id: newRequest.id,
          group_name: group.group_name,
          leader_student_id: group.leader_student_id,
        })
        .select('id')
        .single()

      if (groupError || !newGroup) {
        throw new Error(groupError?.message || 'No se pudo crear el grupo.')
      }

      const groupItemsPayload = group.items.map((item) => ({
        request_group_id: newGroup.id,
        item_id: item.item_id,
        quantity: item.quantity,
      }))

      const { error: groupItemsError } = await supabase
        .from('request_group_items')
        .insert(groupItemsPayload)

      if (groupItemsError) {
        throw new Error(groupItemsError.message)
      }
    }

    return
  }

  const itemIds = formData
    .getAll('item_id')
    .map((value) => String(value || '').trim())

  const quantities = formData
    .getAll('quantity_requested')
    .map((value) => parsePositiveInt(value))

  const rows: RequestedRow[] = itemIds
    .map((item_id, index) => ({
      item_id,
      quantity_requested: quantities[index] ?? 0,
    }))
    .filter((row) => row.item_id && row.quantity_requested > 0)

  if (rows.length === 0) {
    throw new Error('Debe agregar al menos un ítem válido a la solicitud.')
  }

  const itemIdsToCheck = rows.map((row) => row.item_id)

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, status, stock_available')
    .in('id', itemIdsToCheck)

  if (itemsError || !items) {
    throw new Error('No se pudieron validar los ítems seleccionados.')
  }

  const itemMap = new Map(items.map((item) => [item.id, item]))

  for (const row of rows) {
    const item = itemMap.get(row.item_id)

    if (!item) {
      throw new Error('Uno de los ítems seleccionados no existe.')
    }

    if (item.status !== 'active') {
      throw new Error('Uno de los ítems seleccionados no está disponible.')
    }

    if (item.stock_available < row.quantity_requested) {
      throw new Error('La cantidad solicitada excede el stock disponible.')
    }
  }

  const { data: newRequest, error: requestError } = await supabase
    .from('requests')
    .insert({
      user_id: user.id,
      purpose: purpose || null,
      comments: comments || null,
      scheduled_return_date: scheduledReturnDate || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (requestError || !newRequest) {
    throw new Error(requestError?.message || 'No se pudo crear la solicitud.')
  }

  const requestItemsPayload = rows.map((row) => ({
    request_id: newRequest.id,
    item_id: row.item_id,
    quantity_requested: row.quantity_requested,
    quantity_approved: 0,
    quantity_delivered: 0,
    quantity_returned: 0,
    quantity_damaged: 0,
  }))

  const { error: requestItemsError } = await supabase
    .from('request_items')
    .insert(requestItemsPayload)

  if (requestItemsError) {
    throw new Error(requestItemsError.message)
  }

}

function getRequestErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No se pudo procesar la solicitud. Intente nuevamente.'
}

export async function createRequest(formData: FormData): Promise<void> {
  await persistRequest(formData)
  redirect('/solicitudes')
}

export async function createRequestWithState(
  _prevState: RequestActionState,
  formData: FormData
): Promise<RequestActionState> {
  try {
    await persistRequest(formData)
  } catch (error) {
    return { error: getRequestErrorMessage(error) }
  }

  redirect('/solicitudes')
}

export async function cancelOwnRequest(formData: FormData): Promise<void> {
  await persistCancelOwnRequest(formData)
  redirect('/solicitudes')
}

export async function cancelOwnRequestWithState(
  _prevState: CancelRequestActionState,
  formData: FormData
): Promise<CancelRequestActionState> {
  try {
    await persistCancelOwnRequest(formData)
  } catch (error) {
    return { error: getRequestErrorMessage(error) }
  }

  redirect('/solicitudes')
}

async function persistCancelOwnRequest(formData: FormData): Promise<void> {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canUseRequestPortal(profile.role)) {
    redirect('/auth/login')
  }

  const requestId = String(formData.get('request_id') || '').trim()

  if (!requestId) {
    throw new Error('Solicitud inválida.')
  }

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('id, user_id, status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    throw new Error('No se encontró la solicitud.')
  }

  if (request.user_id !== user.id) {
    throw new Error('No puede cancelar una solicitud que no le pertenece.')
  }

  if (request.status !== 'pending') {
    throw new Error('Solo se pueden cancelar solicitudes pendientes.')
  }

  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status: 'cancelled',
    })
    .eq('id', requestId)

  if (updateError) {
    throw new Error(updateError.message)
  }

}