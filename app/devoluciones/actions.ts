'use server'

import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canManageReturns } from '@/lib/supabase/auth/roles'

type LoanItemRecord = {
  id: string
  loan_id: string
  item_id: string
  quantity: number
  returned_quantity: number
  damaged_quantity: number
  missing_quantity: number | null
}

type ParsedReturnInput = {
  loanItemId: string
  quantityOk: number
  quantityDamaged: number
  quantityMissing: number
  notes: string
}

export async function createReturn(formData: FormData): Promise<void> {

  const { supabase, user, profile } = await getAuthProfile()

  if (!canManageReturns(profile.role)) {
    throw new Error('No tiene permisos para registrar devoluciones.')
  }
  const input = parseReturnFormData(formData)
  validateReturnInput(input)

  const { data: loanItem, error: loanItemError } = await supabase
    .from('loan_items')
    .select(`
      id,
      quantity,
      returned_quantity,
      damaged_quantity,
      missing_quantity,
      item_id,
      loan_id,

      items:items(id, name, code),

      loans:loans(
        id,
        status,
        user_id,
        delivery_date,
        expected_return_date,

        loan_groups (
          id,
          group_name,
          leader:profiles(full_name),
          loan_group_items (
            quantity,
            items (
              id,
              name,
              code
            )
          )
        )
      ),

      loan_user:loans!inner(
        user_id,
        profiles:profiles!loans_user_id_fkey(full_name, email)
      )
    `)
    .eq('id', input.loanItemId)
    .single<LoanItemRecord>()

  if (loanItemError || !loanItem) {
    throw new Error('No se encontró el detalle del préstamo.')
  }

  const pendienteActual = getPendingQuantity(loanItem)
  const totalProcesado = getTotalProcessed(input)

  if (totalProcesado > pendienteActual) {
    throw new Error('La devolución excede la cantidad pendiente.')
  }

  const { data: newReturn, error: returnError } = await supabase
    .from('returns')
    .insert({
      loan_id: loanItem.loan_id,
      received_by: user.id,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (returnError || !newReturn) {
    throw new Error(returnError?.message || 'No se pudo crear la devolución.')
  }

  const { error: returnItemError } = await supabase
    .from('return_items')
    .insert({
      return_id: newReturn.id,
      loan_item_id: loanItem.id,
      quantity_ok: input.quantityOk,
      quantity_damaged: input.quantityDamaged,
      quantity_missing: input.quantityMissing,
      notes: input.notes || null,
    })

  if (returnItemError) {
    throw new Error(returnItemError.message)
  }

  const updatedLoanItem = calculateUpdatedLoanItem(loanItem, input)

  const { error: updateLoanItemError } = await supabase
    .from('loan_items')
    .update({
      returned_quantity: updatedLoanItem.returnedQuantity,
      damaged_quantity: updatedLoanItem.damagedQuantity,
      missing_quantity: updatedLoanItem.missingQuantity,
    })
    .eq('id', loanItem.id)

  if (updateLoanItemError) {
    throw new Error(updateLoanItemError.message)
  }

  if (input.quantityOk > 0) {
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, stock_available')
      .eq('id', loanItem.item_id)
      .single()

    if (itemError || !item) {
      throw new Error('No se encontró el item asociado.')
    }

    const { error: stockError } = await supabase
      .from('items')
      .update({
        stock_available: item.stock_available + input.quantityOk,
      })
      .eq('id', item.id)

    if (stockError) {
      throw new Error(stockError.message)
    }
  }

  const pendienteFinal =
    loanItem.quantity -
    updatedLoanItem.returnedQuantity -
    updatedLoanItem.missingQuantity

  const nuevoEstado: 'returned' | 'partial_return' =
    pendienteFinal <= 0 ? 'returned' : 'partial_return'

  const { error: updateLoanError } = await supabase
    .from('loans')
    .update({
      status: nuevoEstado,
      returned_at: nuevoEstado === 'returned' ? new Date().toISOString() : null,
    })
    .eq('id', loanItem.loan_id)

  if (updateLoanError) {
    throw new Error(updateLoanError.message)
  }

  const movementRows = []

  if (input.quantityOk > 0) {
    movementRows.push({
      item_id: loanItem.item_id,
      movement_type: 'return_ok',
      quantity: input.quantityOk,
      reference_table: 'returns',
      reference_id: newReturn.id,
      notes: input.notes || null,
      created_by: user.id,
    })
  }

  if (input.quantityDamaged > 0) {
    movementRows.push({
      item_id: loanItem.item_id,
      movement_type: 'return_damaged',
      quantity: input.quantityDamaged,
      reference_table: 'returns',
      reference_id: newReturn.id,
      notes: input.notes || null,
      created_by: user.id,
    })
  }

  if (input.quantityMissing > 0) {
    movementRows.push({
      item_id: loanItem.item_id,
      movement_type: 'return_missing',
      quantity: input.quantityMissing,
      reference_table: 'returns',
      reference_id: newReturn.id,
      notes: input.notes || null,
      created_by: user.id,
    })
  }

  if (movementRows.length > 0) {
    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert(movementRows)

    if (movementError) {
      throw new Error(movementError.message)
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

  const totalProcesado = getTotalProcessed(input)

  if (totalProcesado <= 0) {
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

function getTotalProcessed(input: ParsedReturnInput): number {
  return input.quantityOk + input.quantityDamaged + input.quantityMissing
}

function getTotalPhysicallyReturned(input: ParsedReturnInput): number {
  return input.quantityOk + input.quantityDamaged
}

function getPendingQuantity(loanItem: LoanItemRecord): number {
  return (
    loanItem.quantity -
    loanItem.returned_quantity -
    (loanItem.missing_quantity ?? 0)
  )
}

function calculateUpdatedLoanItem(
  loanItem: LoanItemRecord,
  input: ParsedReturnInput
) {
  return {
    returnedQuantity:
      loanItem.returned_quantity + getTotalPhysicallyReturned(input),
    damagedQuantity: loanItem.damaged_quantity + input.quantityDamaged,
    missingQuantity: (loanItem.missing_quantity ?? 0) + input.quantityMissing,
  }
}