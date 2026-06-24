import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import { INVENTORY_CATALOG_LIMIT } from '@/lib/query-limits'
import { getEffectiveLoanStatus } from '@/lib/loan-status'

export function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export function formatRequestStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'approved':
      return 'Aprobada'
    case 'rejected':
      return 'Rechazada'
    case 'cancelled':
      return 'Cancelada'
    case 'delivered':
      return 'Entregada'
    case 'returned':
      return 'Devuelta'
    case 'partial_return':
      return 'Devolución parcial'
    default:
      return status
  }
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700'
    case 'approved':
      return 'bg-blue-100 text-blue-700'
    case 'rejected':
      return 'bg-red-100 text-red-700'
    case 'cancelled':
      return 'bg-slate-100 text-slate-700'
    case 'delivered':
      return 'bg-indigo-100 text-indigo-700'
    case 'returned':
      return 'bg-green-100 text-green-700'
    case 'partial_return':
      return 'bg-orange-100 text-orange-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function formatLoanStatus(status: string) {
  switch (status) {
    case 'active':
      return 'Activo'
    case 'returned':
      return 'Devuelto'
    case 'partial_return':
      return 'Devolución parcial'
    case 'overdue':
      return 'Vencido'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status
  }
}

export function loanStatusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700'
    case 'returned':
      return 'bg-green-100 text-green-700'
    case 'partial_return':
      return 'bg-amber-100 text-amber-700'
    case 'overdue':
      return 'bg-red-100 text-red-700'
    case 'cancelled':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export async function getRequestPortalAuth() {
  try {
    return await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }
}

export async function getRequestItems(
  supabase: Awaited<ReturnType<typeof getAuthProfile>>['supabase']
) {
  const { data: items, error } = await supabase
    .from('items')
    .select(`
      id,
      name,
      code,
      stock_available,
      item_type,
      category,
      item_units(asset_code)
    `)
    .eq('status', 'active')
    .order('name', { ascending: true })
    .limit(INVENTORY_CATALOG_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (
    items?.map((item) => ({
      ...item,
      asset_codes:
        item.item_units
          ?.map((unit) => unit.asset_code)
          .filter((code): code is string => Boolean(code)) ?? [],
    })) ?? []
  )
}

export async function getStudentsForGroups(
  supabase: Awaited<ReturnType<typeof getAuthProfile>>['supabase'],
  role: string
) {
  if (!canCreateGroupRequests(role)) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student')
    .eq('is_active', true)
    .order('full_name', { ascending: true })
    .limit(500)

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function getOwnRequests(
  supabase: Awaited<ReturnType<typeof getAuthProfile>>['supabase'],
  userId: string
) {
  const { data: rawRequests, error } = await supabase
    .from('requests')
    .select(`
      id,
      status,
      requested_at,
      purpose,
      comments,
      scheduled_return_date,
      request_items (
        id,
        quantity_requested,
        items (name, code)
      ),
      request_groups (
        id,
        group_name,
        leader_student_id,
        leader:profiles(full_name),
        request_group_items (
          quantity,
          items (name, code)
        )
      )
    `)
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })
    .limit(50)

  if (error) {
    throw new Error(error.message)
  }

  return (
    rawRequests?.map((req) => ({
      id: req.id,
      status: req.status,
      requested_at: req.requested_at,
      purpose: req.purpose,
      comments: req.comments,
      scheduled_return_date: req.scheduled_return_date,
      request_items:
        req.request_items?.map((ri) => ({
          id: ri.id,
          quantity_requested: ri.quantity_requested,
          items: firstOrNull(ri.items),
        })) ?? [],
      request_groups:
        req.request_groups?.map((group) => ({
          id: group.id,
          group_name: group.group_name,
          leader: firstOrNull(group.leader),
          request_group_items:
            group.request_group_items?.map((gi) => ({
              quantity: gi.quantity,
              items: firstOrNull(gi.items),
            })) ?? [],
        })) ?? [],
    })) ?? []
  )
}

export async function getOwnLoans(
  supabase: Awaited<ReturnType<typeof getAuthProfile>>['supabase'],
  userId: string
) {
  const { data: rawLoans, error } = await supabase
    .from('loans')
    .select(`
      id,
      status,
      delivery_date,
      expected_return_date,
      returned_at,
      loan_items (
        id,
        quantity,
        returned_quantity,
        damaged_quantity,
        missing_quantity,
        items (id, name, code)
      ),
      loan_groups (
        id,
        group_name,
        leader:profiles(full_name),
        loan_group_items (
          quantity,
          items (name, code)
        )
      )
    `)
    .eq('user_id', userId)
    .order('delivery_date', { ascending: false })
    .limit(50)

  if (error) {
    throw new Error(error.message)
  }

  return (
    rawLoans?.map((loan) => ({
      id: loan.id,
      status: getEffectiveLoanStatus(loan.status, loan.expected_return_date),
      delivery_date: loan.delivery_date,
      expected_return_date: loan.expected_return_date,
      returned_at: loan.returned_at,
      loan_items:
        loan.loan_items?.map((li) => {
          const item = firstOrNull(li.items) as
            | { id?: string; name?: string; code?: string }
            | null
          const missingQuantity = li.missing_quantity ?? 0
          const pending = li.quantity - li.returned_quantity - missingQuantity

          return {
            id: li.id,
            quantity: li.quantity,
            returned_quantity: li.returned_quantity,
            damaged_quantity: li.damaged_quantity,
            missing_quantity: missingQuantity,
            pending,
            item,
          }
        }) ?? [],
      loan_groups:
        loan.loan_groups?.map((group) => ({
          id: group.id,
          group_name: group.group_name,
          leader: firstOrNull(group.leader),
          loan_group_items:
            group.loan_group_items?.map((gi) => ({
              quantity: gi.quantity,
              item: firstOrNull(gi.items),
            })) ?? [],
        })) ?? [],
    })) ?? []
  )
}
