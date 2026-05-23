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
  const { supabase, user, profile } = await getAuthProfile()

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

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('id, status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    throw new Error('No se encontró la solicitud.')
  }

  if (request.status !== 'pending') {
    throw new Error('Solo se pueden aprobar solicitudes pendientes.')
  }

  const { data: requestGroups, error: groupsError } = await supabase
    .from('request_groups')
    .select('id')
    .eq('request_id', requestId)

  if (groupsError) {
    throw new Error(groupsError.message)
  }

  const hasGroups = (requestGroups ?? []).length > 0

  if (hasGroups) {
    const { error: updateRequestError } = await supabase
      .from('requests')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', requestId)

    if (updateRequestError) {
      throw new Error(updateRequestError.message)
    }

    return
  }

  const { data: requestItems, error: requestItemsError } = await supabase
    .from('request_items')
    .select('id, item_id, quantity_requested')
    .eq('request_id', requestId)

  if (requestItemsError || !requestItems) {
    throw new Error('No se pudieron cargar los ítems de la solicitud.')
  }

  const requestItemMap = new Map(requestItems.map((ri) => [ri.id, ri]))

  const updatePayload = requestItemIds.map((id, index) => ({
    request_item_id: id,
    quantity_approved: approvedQuantities[index] ?? 0,
  }))

  let hasApprovedAtLeastOne = false

  for (const row of updatePayload) {
    const requestItem = requestItemMap.get(row.request_item_id)

    if (!requestItem) {
      throw new Error('Uno de los ítems de la solicitud no es válido.')
    }

    if (row.quantity_approved > requestItem.quantity_requested) {
      throw new Error('La cantidad aprobada no puede exceder la solicitada.')
    }

    if (row.quantity_approved > 0) {
      hasApprovedAtLeastOne = true
    }
  }

  if (!hasApprovedAtLeastOne) {
    throw new Error('Debe aprobar al menos una cantidad mayor a cero.')
  }

  for (const row of updatePayload) {
    const { error } = await supabase
      .from('request_items')
      .update({
        quantity_approved: row.quantity_approved,
      })
      .eq('id', row.request_item_id)

    if (error) {
      throw new Error(error.message)
    }
  }

  const { error: updateRequestError } = await supabase
    .from('requests')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', requestId)

  if (updateRequestError) {
    throw new Error(updateRequestError.message)
  }

}

async function persistRejectRequest(formData: FormData): Promise<void> {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canManageLoans(profile.role)) {
    throw new Error('No tiene permisos para rechazar solicitudes.')
  }

  const requestId = String(formData.get('request_id') || '').trim()
  const rejectionReason = String(formData.get('rejection_reason') || '').trim()

  if (!requestId) {
    throw new Error('Solicitud inválida.')
  }

  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('id, status')
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    throw new Error('No se encontró la solicitud.')
  }

  if (request.status !== 'pending') {
    throw new Error('Solo se pueden rechazar solicitudes pendientes.')
  }

  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: rejectionReason || 'Solicitud rechazada',
    })
    .eq('id', requestId)

  if (updateError) {
    throw new Error(updateError.message)
  }

}

async function persistDeliverRequest(formData: FormData): Promise<void> {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canManageLoans(profile.role)) {
    throw new Error('No tiene permisos para entregar solicitudes.')
  }

  const requestId = String(formData.get('request_id') || '').trim()
  const notes = String(formData.get('delivery_notes') || '').trim()

  if (!requestId) {
    throw new Error('Solicitud inválida.')
  }

  const { error } = await supabase.rpc('deliver_approved_request', {
    p_request_id: requestId,
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
