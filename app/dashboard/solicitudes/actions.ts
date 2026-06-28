'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageLoans } from '@/lib/supabase/auth/roles'

export type ActionState = {
  error: string | null
}

function parseNonNegativeInt(value: FormDataEntryValue | null): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

async function persistApproveRequest(formData: FormData): Promise<void> {
  const { supabase, profile } = await getAuthProfile()

  if (!canManageLoans(profile.role)) {
    throw new Error('No tiene permisos para aprobar solicitudes.')
  }

  const requestId = String(formData.get('request_id') || '').trim()
  const requestItemIds = formData
    .getAll('request_item_id')
    .map((v) => String(v || '').trim())

  const approvedQuantities = formData
    .getAll('quantity_approved')
    .map((v) => parseNonNegativeInt(v))

  if (!requestId) {
    throw new Error('Solicitud inválida.')
  }

  if (requestItemIds.length !== approvedQuantities.length) {
    throw new Error('Los ítems enviados no coinciden con la solicitud.')
  }

  const items = requestItemIds.map((id, index) => ({
    request_item_id: id,
    quantity_approved: approvedQuantities[index] ?? 0,
  }))

  const { error } = await supabase.rpc('approve_request_transaction', {
    p_request_id: requestId,
    p_items: items,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function persistRejectRequest(formData: FormData): Promise<void> {
  const { supabase, profile } = await getAuthProfile()

  if (!canManageLoans(profile.role)) {
    throw new Error('No tiene permisos para rechazar solicitudes.')
  }

  const requestId = String(formData.get('request_id') || '').trim()
  const rejectionReason = String(formData.get('rejection_reason') || '').trim()

  if (!requestId) {
    throw new Error('Solicitud inválida.')
  }

  const { error } = await supabase.rpc('reject_request_transaction', {
    p_request_id: requestId,
    p_rejection_reason: rejectionReason || null,
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function persistDeliverRequest(formData: FormData): Promise<void> {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canManageLoans(profile.role)) {
    throw new Error('No tiene permisos para entregar solicitudes.')
  }

  const requestId = String(formData.get('request_id') || '').trim()
  const notes = String(formData.get('delivery_notes') || '').trim()
  const units = formData.getAll('delivery_unit').map((value) => {
    const [itemId, itemUnitId] = String(value || '').split(':')
    return {
      item_id: itemId?.trim() ?? '',
      item_unit_id: itemUnitId?.trim() ?? '',
    }
  })

  const deliveryItemIds = formData
    .getAll('delivery_item_id')
    .map((value) => String(value || '').trim())
  const deliveryItemItemIds = formData
    .getAll('delivery_item_item_id')
    .map((value) => String(value || '').trim())
  const deliveryQuantities = formData
    .getAll('delivery_item_quantity')
    .map((value) => parseNonNegativeInt(value))

  if (
    deliveryItemIds.length !== deliveryItemItemIds.length ||
    deliveryItemIds.length !== deliveryQuantities.length
  ) {
    throw new Error('Las cantidades de entrega enviadas no son válidas.')
  }

  const items = deliveryItemItemIds
    .map((itemId, index) => ({
      request_item_id: deliveryItemIds[index] || null,
      item_id: itemId,
      quantity: deliveryQuantities[index] ?? 0,
    }))
    .filter((item) => item.item_id && item.quantity > 0)

  if (units.some((unit) => !unit.item_id || !unit.item_unit_id)) {
    throw new Error('Una de las unidades patrimoniales seleccionadas no es válida.')
  }

  if (!requestId) {
    throw new Error('Solicitud inválida.')
  }

  if (items.length === 0) {
    throw new Error('Debe entregar al menos un material con stock disponible.')
  }

  const { error } = await supabase.rpc('deliver_approved_request_with_units', {
    p_request_id: requestId,
    p_units: units,
    p_items: items,
    p_delivered_by: user.id,
    p_notes: notes || null,
  })

  if (error) {
    throw new Error(error.message)
  }
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No se pudo procesar la acción. Intente nuevamente.'
}

export async function approveRequest(formData: FormData): Promise<void> {
  await persistApproveRequest(formData)
  redirect('/dashboard/solicitudes')
}

export async function approveRequestWithState(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await persistApproveRequest(formData)
  } catch (error) {
    return { error: getActionErrorMessage(error) }
  }

  redirect('/dashboard/solicitudes')
}

export async function rejectRequest(formData: FormData): Promise<void> {
  await persistRejectRequest(formData)
  redirect('/dashboard/solicitudes')
}

export async function rejectRequestWithState(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await persistRejectRequest(formData)
  } catch (error) {
    return { error: getActionErrorMessage(error) }
  }

  redirect('/dashboard/solicitudes')
}

export async function deliverRequest(formData: FormData): Promise<void> {
  await persistDeliverRequest(formData)
  redirect('/dashboard/solicitudes')
}

export async function deliverRequestWithState(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await persistDeliverRequest(formData)
  } catch (error) {
    return { error: getActionErrorMessage(error) }
  }

  redirect('/dashboard/solicitudes')
}
