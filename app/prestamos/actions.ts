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

  if (expectedReturnDateRaw && !isValidDateInput(expectedReturnDateRaw)) {
    throw new Error('La fecha esperada de devolución no es válida.')
  }

  if (expectedReturnDateRaw && expectedReturnDateRaw < getEcuadorDate()) {
    throw new Error('La fecha esperada de devolución no puede estar en el pasado.')
  }

  const [borrowerResult, itemResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .in('role', ['teacher', 'student'])
      .maybeSingle(),
    supabase
      .from('items')
      .select('id, stock_available')
      .eq('id', itemId)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  if (borrowerResult.error) {
    throw new Error(borrowerResult.error.message)
  }

  if (!borrowerResult.data) {
    throw new Error('El prestatario seleccionado no es válido.')
  }

  if (itemResult.error) {
    throw new Error(itemResult.error.message)
  }

  if (!itemResult.data || itemResult.data.stock_available < quantity) {
    throw new Error('El material no existe o no tiene stock suficiente.')
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

  if (!Number.isInteger(n) || n < 1) {
    return 0
  }

  return n
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function getEcuadorDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}
