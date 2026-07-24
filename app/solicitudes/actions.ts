'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { getActionErrorMessage } from '@/lib/action-error'
import { canCreateGroupRequests, canUseRequestPortal } from '@/lib/supabase/auth/roles'

export type RequestActionState = {
  error: string | null
}

export type CancelRequestActionState = {
  error: string | null
}

function parsePositiveInt(value: FormDataEntryValue | null): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) return 0
  return n
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

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function getEcuadorDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

async function persistRequest(formData: FormData): Promise<void> {
  const { supabase, profile } = await getAuthProfile()

  if (!canUseRequestPortal(profile.role)) {
    redirect('/auth/login')
  }

  const purpose = String(formData.get('purpose') || '').trim()
  const comments = String(formData.get('comments') || '').trim()
  const scheduledReturnDate = String(
    formData.get('scheduled_return_date') || ''
  ).trim()

  const groups = parseGroups(formData)

  if (groups.length > 0 && !canCreateGroupRequests(profile.role)) {
    throw new Error('Su rol no permite crear solicitudes grupales.')
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

  if (groups.length === 0 && rows.length === 0) {
    throw new Error('Debe agregar al menos un ítem válido a la solicitud.')
  }

  if (scheduledReturnDate && !isValidDateInput(scheduledReturnDate)) {
    throw new Error('La fecha estimada de devolución no es válida.')
  }

  if (scheduledReturnDate && scheduledReturnDate < getEcuadorDate()) {
    throw new Error('La fecha estimada de devolución no puede estar en el pasado.')
  }

  const { error } = await supabase.rpc('create_request_transaction', {
    p_purpose: purpose || null,
    p_comments: comments || null,
    p_scheduled_return_date: scheduledReturnDate || null,
    p_items: groups.length > 0 ? [] : rows,
    p_groups: groups,
  })

  if (error) {
    throw new Error(error.message)
  }
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
    return { error: getActionErrorMessage(error, 'No se pudo procesar la solicitud. Intente nuevamente.') }
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
    return { error: getActionErrorMessage(error, 'No se pudo procesar la solicitud. Intente nuevamente.') }
  }

  redirect('/solicitudes')
}

async function persistCancelOwnRequest(formData: FormData): Promise<void> {
  const { supabase, profile } = await getAuthProfile()

  if (!canUseRequestPortal(profile.role)) {
    redirect('/auth/login')
  }

  const requestId = String(formData.get('request_id') || '').trim()

  if (!requestId) {
    throw new Error('Solicitud inválida.')
  }

  const { data: cancelledRequestId, error: updateError } = await supabase.rpc(
    'cancel_own_request_transaction',
    {
      p_request_id: requestId,
    }
  )

  if (updateError) {
    throw new Error(updateError.message)
  }

  if (!cancelledRequestId) {
    throw new Error(
      'La solicitud no existe, no le pertenece o ya no está pendiente.'
    )
  }

}