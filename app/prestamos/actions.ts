'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageLoans } from '@/lib/supabase/auth/roles'

export type LoanActionState = {
  error: string | null
}

async function persistLoan(formData: FormData): Promise<void> {
  const { supabase, user, profile } = await getAuthProfile()

  if (!canManageLoans(profile.role)) {
    throw new Error('No tiene permisos para registrar préstamos.')
  }

  const userId = String(formData.get('user_id') || '').trim()
  const itemId = String(formData.get('item_id') || '').trim()
  const quantity = parseNumber(formData.get('quantity'))
  const expectedReturnDateRaw = String(
    formData.get('expected_return_date') || ''
  ).trim()
  const notes = String(formData.get('notes') || '').trim()

  if (!userId || !itemId || quantity <= 0) {
    throw new Error('Datos inválidos del préstamo.')
  }

  const expectedReturnDate = expectedReturnDateRaw || null

  const { error } = await supabase.rpc('create_loan_transaction', {
    p_user_id: userId,
    p_item_id: itemId,
    p_quantity: quantity,
    p_expected_return_date: expectedReturnDate,
    p_notes: notes || null,
    p_delivered_by: user.id,
  })

  if (error) {
    throw new Error(error.message)
  }

}

function getLoanErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No se pudo registrar el préstamo. Intente nuevamente.'
}

export async function createLoan(formData: FormData): Promise<void> {
  await persistLoan(formData)
  redirect('/prestamos')
}

export async function createLoanWithState(
  _prevState: LoanActionState,
  formData: FormData
): Promise<LoanActionState> {
  try {
    await persistLoan(formData)
  } catch (error) {
    return { error: getLoanErrorMessage(error) }
  }

  redirect('/prestamos')
}

function parseNumber(value: FormDataEntryValue | null): number {
  const n = Number(value)

  if (!Number.isFinite(n) || n < 1) {
    return 0
  }

  return Math.floor(n)
}