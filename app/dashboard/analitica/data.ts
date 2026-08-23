import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildItemUsageAnalytics,
  type AnalyticsInventoryItem,
  type AnalyticsPeriod,
  type AnalyticsUsageEvent,
} from '@/lib/item-usage-analytics'
import { firstOrNull } from '@/lib/supabase/query-utils'

const PAGE_SIZE = 1000

export async function loadItemUsageAnalytics(
  supabase: SupabaseClient,
  options: { now: Date; period: AnalyticsPeriod }
) {
  const items: AnalyticsInventoryItem[] = []
  const usageEvents: AnalyticsUsageEvent[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('items')
      .select('id, code, name, category, item_type, stock_total, stock_available, status, location')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    items.push(...page.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      category: item.category,
      itemType: item.item_type,
      stockTotal: item.stock_total,
      stockAvailable: item.stock_available,
      status: item.status,
      location: item.location,
    })))
    if (page.length < PAGE_SIZE) break
  }

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('loan_items')
      .select('loan_id, item_id, quantity, loans:loans(user_id, delivery_date)')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    for (const entry of page) {
      const loan = firstOrNull(entry.loans)
      if (!entry.item_id || !loan?.user_id || !loan.delivery_date) continue
      usageEvents.push({
        loanId: entry.loan_id,
        itemId: entry.item_id,
        userId: loan.user_id,
        quantity: entry.quantity,
        usedAt: loan.delivery_date,
      })
    }
    if (page.length < PAGE_SIZE) break
  }

  return buildItemUsageAnalytics(items, usageEvents, options)
}
