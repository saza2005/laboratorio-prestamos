'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageInventory } from '@/lib/supabase/auth/roles'

export type InventoryActionState = {
  error: string | null
}

async function persistItem(formData: FormData) {
  const { supabase, profile } = await getAuthProfile()

  if (!canManageInventory(profile.role)) {
    throw new Error('No tiene permisos para gestionar inventario.')
  }

  const code = String(formData.get('code') || '').trim()
  const name = String(formData.get('name') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const category = String(formData.get('category') || '').trim()
  const itemType = String(formData.get('item_type') || '').trim()
  const trackIndividual = formData.get('track_individual') === 'on'
  const stockTotal = Number(formData.get('stock_total') || 0)
  const stockAvailable = Number(formData.get('stock_available') || 0)
  const status = String(formData.get('status') || '').trim()
  const location = String(formData.get('location') || '').trim()

  if (!code || !name || !itemType || !status) {
    throw new Error('Faltan campos obligatorios.')
  }

  if (!Number.isInteger(stockTotal) || !Number.isInteger(stockAvailable)) {
    throw new Error('Los valores de stock deben ser números enteros.')
  }

  if (stockTotal < 0 || stockAvailable < 0) {
    throw new Error('Los valores de stock no pueden ser negativos.')
  }

  if (stockAvailable > stockTotal) {
    throw new Error('El stock disponible no puede superar el stock total.')
  }

  if (trackIndividual && itemType !== 'equipment') {
    throw new Error(
      'El seguimiento individual solo está disponible para equipos.'
    )
  }

  if (trackIndividual && stockAvailable !== stockTotal) {
    throw new Error(
      'Los equipos con seguimiento individual deben iniciar con todo el stock disponible.'
    )
  }

  if (trackIndividual && stockTotal > 1000) {
    throw new Error(
      'No se pueden generar más de 1000 unidades individuales por ítem.'
    )
  }

  const { error } = await supabase.rpc('create_inventory_item_transaction', {
    p_code: code,
    p_name: name,
    p_description: description || null,
    p_category: category || null,
    p_item_type: itemType,
    p_track_individual: trackIndividual,
    p_stock_total: stockTotal,
    p_stock_available: stockAvailable,
    p_status: status,
    p_location: location || null,
  })

  if (error) {
    throw new Error(error.message)
  }
}

function getInventoryErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No se pudo guardar el ítem. Intente nuevamente.'
}

export async function createItem(formData: FormData): Promise<void> {
  await persistItem(formData)
  redirect('/inventario')
}

export async function createItemWithState(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await persistItem(formData)
  } catch (error) {
    return { error: getInventoryErrorMessage(error) }
  }

  redirect('/inventario')
}