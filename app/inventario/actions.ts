'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageInventory } from '@/lib/supabase/auth/roles'

export async function createItem(formData: FormData) {
  const { supabase, user, profile } = await getAuthProfile()

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

  if (!Number.isFinite(stockTotal) || !Number.isFinite(stockAvailable)) {
    throw new Error('Los valores de stock deben ser números válidos.')
  }

  if (stockTotal < 0 || stockAvailable < 0) {
    throw new Error('Los valores de stock no pueden ser negativos.')
  }

  if (stockAvailable > stockTotal) {
    throw new Error('El stock disponible no puede superar el stock total.')
  }

  if (trackIndividual && itemType === 'equipment' && stockAvailable !== stockTotal) {
    throw new Error(
      'Los equipos con seguimiento individual deben iniciar con todo el stock disponible.'
    )
  }

  const { data: newItem, error } = await supabase
    .from('items')
    .insert({
      code,
      name,
      description: description || null,
      category: category || null,
      item_type: itemType,
      track_individual: trackIndividual,
      stock_total: stockTotal,
      stock_available: stockAvailable,
      status,
      location: location || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (trackIndividual && itemType === 'equipment') {
    const units = []

    for (let i = 1; i <= stockTotal; i++) {
      const codeFormatted = `${code}-${String(i).padStart(3, '0')}`

      units.push({
        item_id: newItem.id,
        serial_code: codeFormatted,
        qr_code: codeFormatted,
        condition: 'good',
        availability_status: 'available',
        notes: null,
      })
    }

    const { error: unitError } = await supabase
      .from('item_units')
      .insert(units)

    if (unitError) {
      throw new Error(unitError.message)
    }
  }

  redirect('/inventario')
}