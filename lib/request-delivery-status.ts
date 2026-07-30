import { firstOrNull } from './supabase/query-utils'

type RequestItemDelivery = {
  quantity_approved: number
  quantity_delivered: number
}

type GroupItemDelivery = {
  item_id: string | null
  quantity: number
}

type RequestGroupDelivery = {
  request_group_items?: GroupItemDelivery[] | null
}

type LoanItemDelivery = {
  item_id: string | null
  quantity: number
}

type RequestLoanDelivery = {
  loan_items?: LoanItemDelivery[] | null
}

export type RequestDeliveryStatusSource = {
  status: string | null
  request_items?: RequestItemDelivery[] | null
  request_groups?: RequestGroupDelivery[] | null
  loans?: RequestLoanDelivery | RequestLoanDelivery[] | null
}

export function isPartiallyDeliveredRequest(
  requestEntry: RequestDeliveryStatusSource
) {
  if (requestEntry.status !== 'delivered') return false

  if (!requestEntry.request_groups?.length) {
    return (requestEntry.request_items ?? [])
      .filter((item) => item.quantity_approved > 0)
      .some((item) => item.quantity_delivered < item.quantity_approved)
  }

  const deliveredByItem = getDeliveredQuantityByItem(requestEntry.loans)
  const requestedByItem = new Map<string, number>()

  for (const group of requestEntry.request_groups) {
    for (const groupItem of group.request_group_items ?? []) {
      if (!groupItem.item_id) continue
      requestedByItem.set(
        groupItem.item_id,
        (requestedByItem.get(groupItem.item_id) ?? 0) + groupItem.quantity
      )
    }
  }

  return [...requestedByItem.entries()].some(
    ([itemId, requestedQuantity]) =>
      (deliveredByItem.get(itemId) ?? 0) < requestedQuantity
  )
}

export function getVisibleRequestStatus(requestEntry: RequestDeliveryStatusSource) {
  return isPartiallyDeliveredRequest(requestEntry)
    ? 'partial_delivery'
    : requestEntry.status ?? ''
}

function getDeliveredQuantityByItem(
  loans: RequestLoanDelivery | RequestLoanDelivery[] | null | undefined
) {
  const deliveredByItem = new Map<string, number>()
  const requestLoan = firstOrNull(loans)

  for (const loanItem of requestLoan?.loan_items ?? []) {
    if (!loanItem.item_id) continue
    deliveredByItem.set(
      loanItem.item_id,
      (deliveredByItem.get(loanItem.item_id) ?? 0) + loanItem.quantity
    )
  }

  return deliveredByItem
}


export function getRequestOperationalPriority(status: string | null | undefined) {
  switch (status) {
    case 'pending':
      return 0
    case 'approved':
      return 1
    case 'partial_delivery':
      return 2
    case 'delivered':
      return 3
    case 'rejected':
      return 4
    case 'cancelled':
      return 5
    default:
      return 6
  }
}

export function compareRequestsByOperationalPriority(
  a: { status: string | null | undefined; requested_at: string | null | undefined },
  b: { status: string | null | undefined; requested_at: string | null | undefined }
) {
  const priorityDiff =
    getRequestOperationalPriority(a.status) - getRequestOperationalPriority(b.status)

  if (priorityDiff !== 0) return priorityDiff

  const dateA = a.requested_at ? new Date(a.requested_at).getTime() : 0
  const dateB = b.requested_at ? new Date(b.requested_at).getTime() : 0

  return dateA - dateB
}
