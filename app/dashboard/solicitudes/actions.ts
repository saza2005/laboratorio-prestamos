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
    const groupIds = (requestGroups ?? []).map((group) => group.id)
    const { data: groupItems, error: groupItemsError } = await supabase
      .from('request_group_items')
      .select('item_id, quantity')
      .in('request_group_id', groupIds)

    if (groupItemsError || !groupItems || groupItems.length === 0) {
      throw new Error('No se pudieron validar los materiales de los grupos.')
    }

    const totalsByItem = new Map<string, number>()

    for (const groupItem of groupItems) {
      if (!groupItem.item_id || groupItem.quantity < 1) {
        throw new Error('Uno de los materiales grupales no es válido.')
      }

      totalsByItem.set(
        groupItem.item_id,
        (totalsByItem.get(groupItem.item_id) ?? 0) + groupItem.quantity
      )
    }

    const itemIds = Array.from(totalsByItem.keys())
    const { data: currentItems, error: currentItemsError } = await supabase
      .from('items')
      .select('id, stock_available, status')
      .in('id', itemIds)

    if (currentItemsError || !currentItems) {
      throw new Error('No se pudo verificar el stock actual de los grupos.')
    }

    const currentItemMap = new Map(currentItems.map((item) => [item.id, item]))

    for (const [itemId, totalQuantity] of totalsByItem.entries()) {
      const item = currentItemMap.get(itemId)

      if (!item || item.status !== 'active') {
        throw new Error('Uno de los materiales grupales ya no está disponible.')
      }

      if (totalQuantity > item.stock_available) {
        throw new Error(
          'La cantidad total de los grupos excede el stock disponible.'
        )
      }
    }

    const { data: approvedRequest, error: updateRequestError } = await supabase
      .from('requests')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (updateRequestError) {
      throw new Error(updateRequestError.message)
    }

    if (!approvedRequest) {
      throw new Error('La solicitud ya no está pendiente.')
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

  if (
    requestItemIds.length !== requestItems.length ||
    approvedQuantities.length !== requestItems.length ||
    new Set(requestItemIds).size !== requestItemIds.length
  ) {
    throw new Error('Los ítems enviados no coinciden con la solicitud.')
  }

  const itemIds = Array.from(new Set(requestItems.map((item) => item.item_id)))
  const { data: currentItems, error: currentItemsError } = await supabase
    .from('items')
    .select('id, stock_available, status')
    .in('id', itemIds)

  if (currentItemsError || !currentItems) {
    throw new Error('No se pudo verificar el stock actual.')
  }

  const requestItemMap = new Map(requestItems.map((ri) => [ri.id, ri]))
  const currentItemMap = new Map(currentItems.map((item) => [item.id, item]))

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

    const currentItem = currentItemMap.get(requestItem.item_id)

    if (!currentItem || currentItem.status !== 'active') {
      throw new Error('Uno de los ítems ya no está disponible.')
    }

    if (row.quantity_approved > requestItem.quantity_requested) {
      throw new Error('La cantidad aprobada no puede exceder la solicitada.')
    }

    if (row.quantity_approved > currentItem.stock_available) {
      throw new Error('La cantidad aprobada excede el stock disponible.')
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

  const { data: approvedRequest, error: updateRequestError } = await supabase
    .from('requests')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateRequestError) {
    throw new Error(updateRequestError.message)
  }

  if (!approvedRequest) {
    throw new Error('La solicitud ya no está pendiente.')
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

  const { data: rejectedRequest, error: updateError } = await supabase
    .from('requests')
    .update({
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: rejectionReason || 'Solicitud rechazada',
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (updateError) {
    throw new Error(updateError.message)
  }

  if (!rejectedRequest) {
    throw new Error('La solicitud no existe o ya no está pendiente.')
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
