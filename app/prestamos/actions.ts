'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageLoans } from '@/lib/supabase/auth/roles'
import { getActionErrorMessage } from '@/lib/action-error'

export type LoanActionState = { error: string | null }

type LoanItemInput = {
  item_id: string
  item_unit_id: string | null
  quantity: number
}

function parseLoanItems(formData: FormData): LoanItemInput[] {
  const rows = new Map<number, Partial<LoanItemInput>>()

  for (const [key, value] of formData.entries()) {
    const match = key.match(/^items\[(\d+)\]\[(item_id|item_unit_id|quantity)\]$/)
    if (!match) continue
    const index = Number(match[1])
    const field = match[2]
    const row = rows.get(index) ?? {}

    if (field === 'quantity') row.quantity = parseNumber(value)
    if (field === 'item_id') row.item_id = String(value || '').trim()
    if (field === 'item_unit_id') {
      row.item_unit_id = String(value || '').trim() || null
    }
    rows.set(index, row)
  }

  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => ({
      item_id: row.item_id ?? '',
      item_unit_id: row.item_unit_id ?? null,
      quantity: row.quantity ?? 0,
    }))
    .filter((row) => row.item_id && row.quantity > 0)
}

async function persistLoan(formData: FormData): Promise<void> {
  const { supabase, user, profile } = await getAuthProfile()
  if (!canManageLoans(profile.role)) {
    throw new Error('No tiene permisos para registrar préstamos.')
  }

  const userId = String(formData.get('user_id') || '').trim()
  const loanItems = parseLoanItems(formData)
  const expectedReturnDateRaw = String(formData.get('expected_return_date') || '').trim()
  const notes = String(formData.get('notes') || '').trim()

  if (!userId || loanItems.length === 0) {
    throw new Error('Debe seleccionar un prestatario y al menos un material.')
  }
  if (expectedReturnDateRaw && !isValidDateInput(expectedReturnDateRaw)) {
    throw new Error('La fecha esperada de devolución no es válida.')
  }
  if (expectedReturnDateRaw && expectedReturnDateRaw < getEcuadorDate()) {
    throw new Error('La fecha esperada de devolución no puede estar en el pasado.')
  }

  const { error } = await supabase.rpc('create_multi_item_loan_transaction', {
    p_user_id: userId,
    p_items: loanItems,
    p_expected_return_date: expectedReturnDateRaw || null,
    p_notes: notes || null,
    p_delivered_by: user.id,
  })
  if (error) throw new Error(error.message)
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
    return { error: getActionErrorMessage(error, 'No se pudo registrar el préstamo. Intente nuevamente.') }
  }
  redirect('/prestamos')
}

function parseNumber(value: FormDataEntryValue | null): number {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : 0
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function getEcuadorDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
