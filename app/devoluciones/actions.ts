'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageReturns } from '@/lib/supabase/auth/roles'

export type ReturnActionState = {
  error: string | null
}

type ParsedReturnInput = {
  loanItemId: string
  quantityOk: number
  quantityDamaged: number
  quantityMissing: number
  notes: string
}

async function persistReturn(formData: FormData): Promise<void> {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canManageReturns(profile.role)) {
    throw new Error('No tiene permisos para registrar devoluciones.')
  }

  const input = parseReturnFormData(formData)
  validateReturnInput(input)

  const { error } = await supabase.rpc('register_return_transaction', {
    p_loan_item_id: input.loanItemId,
    p_quantity_ok: input.quantityOk,
    p_quantity_damaged: input.quantityDamaged,
    p_quantity_missing: input.quantityMissing,
    p_notes: input.notes || null,
    p_received_by: user.id,
  })

  if (error) {
    throw new Error(error.message)
  }
}

function getReturnErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No se pudo registrar la devolución. Intente nuevamente.'
}

export async function createReturn(formData: FormData): Promise<void> {
  await persistReturn(formData)
  redirect('/devoluciones')
}

export async function createReturnWithState(
  _prevState: ReturnActionState,
  formData: FormData
): Promise<ReturnActionState> {
  try {
    await persistReturn(formData)
  } catch (error) {
    return { error: getReturnErrorMessage(error) }
  }

  redirect('/devoluciones')
}

function parseReturnFormData(formData: FormData): ParsedReturnInput {
  return {
    loanItemId: String(formData.get('loan_item_id') || '').trim(),
    quantityOk: parseNonNegativeInteger(formData.get('quantity_ok')),
    quantityDamaged: parseNonNegativeInteger(formData.get('quantity_damaged')),
    quantityMissing: parseNonNegativeInteger(formData.get('quantity_missing')),
    notes: String(formData.get('notes') || '').trim(),
  }
}

function validateReturnInput(input: ParsedReturnInput) {
  if (!input.loanItemId) {
    throw new Error('Debe seleccionar un préstamo.')
  }

  const totalProcessed =
    input.quantityOk + input.quantityDamaged + input.quantityMissing

  if (totalProcessed <= 0) {
    throw new Error('Debe registrar al menos una unidad.')
  }
}

function parseNonNegativeInteger(value: FormDataEntryValue | null): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return Math.floor(parsed)
}
