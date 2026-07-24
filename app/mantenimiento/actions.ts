'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageInventory } from '@/lib/supabase/auth/roles'
import { getActionErrorMessage } from '@/lib/action-error'
import { isValidDateInput } from '@/lib/date-input'

export type MaintenanceActionState = {
  error: string | null
}

async function persistMaintenance(formData: FormData) {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canManageInventory(profile.role)) {
    throw new Error('No tiene permisos para registrar mantenimiento.')
  }

  const itemId = String(formData.get('item_id') || '').trim()
  const activity = String(formData.get('activity') || '').trim()
  const responsible = String(formData.get('responsible') || '').trim()
  const maintenanceDate = String(formData.get('maintenance_date') || '').trim()
  const observations = String(formData.get('observations') || '').trim()
  const maintenanceType = String(formData.get('maintenance_type') || '').trim()
  const isGeneralMaintenance = itemId === 'general'

  if (!itemId || !activity || !responsible || !maintenanceDate || !maintenanceType) {
    throw new Error('Faltan campos obligatorios.')
  }

  if (!['preventive', 'corrective'].includes(maintenanceType)) {
    throw new Error('El tipo de mantenimiento no es válido.')
  }

  if (!isValidDateInput(maintenanceDate)) {
    throw new Error('La fecha de mantenimiento no es válida.')
  }

  if (!isGeneralMaintenance) {
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id')
      .eq('id', itemId)
      .eq('item_type', 'equipment')
      .eq('status', 'active')
      .maybeSingle()

    if (itemError) {
      throw new Error(itemError.message)
    }

    if (!item) {
      throw new Error('El equipo seleccionado no existe, no está activo o no es válido.')
    }
  }

  const { error } = await supabase
    .from('maintenance_records')
    .insert({
      item_id: isGeneralMaintenance ? null : itemId,
      activity,
      responsible,
      maintenance_date: maintenanceDate,
      observations: observations || null,
      maintenance_type: maintenanceType,
      created_by: user.id,
    })

  if (error) {
    throw new Error(error.message)
  }

}


export async function createMaintenance(formData: FormData): Promise<void> {
  await persistMaintenance(formData)
  redirect('/mantenimiento')
}

export async function createMaintenanceWithState(
  _prevState: MaintenanceActionState,
  formData: FormData
): Promise<MaintenanceActionState> {
  try {
    await persistMaintenance(formData)
  } catch (error) {
    return { error: getActionErrorMessage(error, 'No se pudo registrar el mantenimiento. Intente nuevamente.') }
  }

  redirect('/mantenimiento')
}
