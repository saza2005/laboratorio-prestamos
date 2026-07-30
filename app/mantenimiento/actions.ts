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
  const { supabase, profile } = await getAuthProfile()

  if (!canManageInventory(profile.role)) {
    throw new Error('No tiene permisos para registrar mantenimiento.')
  }

  const itemId = String(formData.get('item_id') || '').trim()
  const activity = String(formData.get('activity') || '').trim()
  const responsible = String(formData.get('responsible') || '').trim()
  const maintenanceDate = String(formData.get('maintenance_date') || '').trim()
  const observations = String(formData.get('observations') || '').trim()
  const maintenanceType = String(formData.get('maintenance_type') || '').trim()
  const itemUnitId = String(formData.get('item_unit_id') || '').trim()
  const markUnitUnavailable = formData.get('mark_unit_unavailable') === 'on'
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

    if (itemUnitId) {
      const { data: unit, error: unitError } = await supabase
        .from('item_units')
        .select('id, availability_status')
        .eq('id', itemUnitId)
        .eq('item_id', itemId)
        .maybeSingle()

      if (unitError) {
        throw new Error(unitError.message)
      }

      if (!unit) {
        throw new Error('La unidad seleccionada no pertenece al equipo.')
      }

      if (unit.availability_status === 'loaned') {
        throw new Error('No se puede registrar mantenimiento sobre una unidad prestada.')
      }
    }
  } else if (itemUnitId) {
    throw new Error('Un trabajo general no puede tener una unidad asociada.')
  }

  const { error } = await supabase.rpc('register_maintenance_record_transaction', {
    p_item_id: isGeneralMaintenance ? null : itemId,
    p_item_unit_id: itemUnitId || null,
    p_activity: activity,
    p_responsible: responsible,
    p_maintenance_date: maintenanceDate,
    p_observations: observations || null,
    p_maintenance_type: maintenanceType,
    p_mark_unit_unavailable: markUnitUnavailable,
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
