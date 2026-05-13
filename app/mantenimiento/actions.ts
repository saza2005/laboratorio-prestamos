'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageInventory } from '@/lib/supabase/auth/roles'

export async function createMaintenance(formData: FormData) {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canManageInventory(profile.role)) {
    throw new Error('No tiene permisos para registrar mantenimiento.')
  }

  const itemId = String(formData.get('item_id') || '')
  const activity = String(formData.get('activity') || '').trim()
  const responsible = String(formData.get('responsible') || '').trim()
  const maintenanceDate = String(formData.get('maintenance_date') || '')
  const observations = String(formData.get('observations') || '').trim()
  const maintenanceType = String(formData.get('maintenance_type') || '')

  if (!itemId || !activity || !responsible || !maintenanceDate || !maintenanceType) {
    throw new Error('Faltan campos obligatorios.')
  }

  const { error } = await supabase
    .from('maintenance_records')
    .insert({
      item_id: itemId,
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

  redirect('/mantenimiento')
}