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
