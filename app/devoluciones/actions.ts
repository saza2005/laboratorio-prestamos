'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageReturns } from '@/lib/supabase/auth/roles'
import { getActionErrorMessage } from '@/lib/action-error'
import { sendTransactionalEmail } from '@/lib/email/send-transactional-email'

export type ReturnActionState = {
  error: string | null
}

export type FullReturnActionState = {
  error: string | null
  success: string | null
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

  const { data: returnId, error } = await supabase.rpc('register_return_transaction', {
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

  if (returnId) {
    await sendTransactionalEmail(supabase, {
      type: 'return-registered',
      returnId,
    })
  }
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
    return { error: getActionErrorMessage(error, 'No se pudo registrar la devolución. Intente nuevamente.') }
  }

  redirect('/devoluciones')
}

export async function createFullReturnWithState(
  _prevState: FullReturnActionState,
  formData: FormData
): Promise<FullReturnActionState> {
  try {
    const { supabase, user, profile } = await getAuthProfile()

    if (!canManageReturns(profile.role)) {
      throw new Error('No tiene permisos para registrar devoluciones.')
    }

    const loanId = String(formData.get('loan_id') || '').trim()
    const notes = String(formData.get('notes') || '').trim()

    if (!loanId) {
      throw new Error('Debe seleccionar un préstamo.')
    }

    const { data: returnId, error } = await supabase.rpc(
      'register_full_return_transaction',
      {
        p_loan_id: loanId,
        p_notes: notes || null,
        p_received_by: user.id,
      }
    )

    if (error) {
      throw new Error(error.message)
    }

    if (returnId) {
      await sendTransactionalEmail(supabase, {
        type: 'return-registered',
        returnId,
      })
    }
  } catch (error) {
    return {
      error: getActionErrorMessage(
        error,
        'No se pudo registrar la devolución completa. Intente nuevamente.'
      ),
      success: null,
    }
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

  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0
  }

  return parsed
}
