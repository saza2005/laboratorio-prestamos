import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canCreateGroupRequests } from '@/lib/supabase/auth/roles'
import {
  INVENTORY_CATALOG_LIMIT,
  PROFILE_SELECT_LIMIT,
  USER_HISTORY_LIMIT,
} from '@/lib/query-limits'
import { getEffectiveLoanStatus } from '@/lib/loan-status'
export {
  formatLoanStatus,
  formatRequestStatus,
  loanStatusBadgeClass,
  requestStatusBadgeClass as statusBadgeClass,
} from '@/lib/status-format'
import { firstOrNull } from '@/lib/supabase/query-utils'
import { compareRequestsByOperationalPriority, getVisibleRequestStatus } from '@/lib/request-delivery-status'

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
    .order('category', { ascending: true })
    .order('name', { ascending: true })
    .order('code', { ascending: true })
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
          .filter((code): code is string => Boolean(code))
          .sort((a, b) => a.localeCompare(b, 'es')) ?? [],
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
    .limit(PROFILE_SELECT_LIMIT)

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
        quantity_approved,
        quantity_delivered,
        items (name, code)
      ),
      request_groups (
        id,
        group_name,
        leader_student_id,
        leader:profiles(full_name),
        request_group_items (
          item_id,
          quantity,
          items (name, code)
        )
      ),
      loans (
        id,
        loan_items (
          item_id,
          quantity
        )
      )
    `)
    .eq('user_id', userId)
    .order('requested_at', { ascending: true })
    .limit(USER_HISTORY_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (
    rawRequests?.map((req) => {
      const requestLoan = firstOrNull(req.loans)

      return {
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
          quantity_approved: ri.quantity_approved,
          quantity_delivered: ri.quantity_delivered,
          items: firstOrNull(ri.items),
        })) ?? [],
      request_groups:
        req.request_groups?.map((group) => ({
          id: group.id,
          group_name: group.group_name,
          leader: firstOrNull(group.leader),
          request_group_items:
            group.request_group_items?.map((gi) => ({
              item_id: gi.item_id,
              quantity: gi.quantity,
              items: firstOrNull(gi.items),
            })) ?? [],
        })) ?? [],
        loans: requestLoan
          ? [
              {
                id: requestLoan.id,
                loan_items:
                  requestLoan.loan_items?.map((loanItem) => ({
                    item_id: loanItem.item_id,
                    quantity: loanItem.quantity,
                  })) ?? [],
              },
            ]
          : [],
      }
    })
      .map((request) => ({
        ...request,
        status: getVisibleRequestStatus(request),
      }))
      .sort(compareRequestsByOperationalPriority) ?? []
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
    .limit(USER_HISTORY_LIMIT)

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
