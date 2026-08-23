import { createClient } from '@supabase/supabase-js'

type RemoteItem = {
  id: string
  code: string
  name: string
  category: string | null
  status: string
  stock_total: number
}

type ExpectedRow = RemoteItem & {
  quantity: number
  uniqueLoans: number
  lastUsage: string | null
  usage30: number
  usage90: number
  usage365: number
  demandStock90: number | null
  users: Set<string>
}

const dayMs = 86_400_000

export async function loadIndependentExpected(now = new Date()) {
  process.loadEnvFile('.env.e2e')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing configured read-only verification capability')
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const items = await paged(async (from, to) => {
    const result = await client.from('items')
      .select('id, code, name, category, status, stock_total')
      .order('id', { ascending: true }).range(from, to)
    if (result.error) throw new Error('Independent items read failed')
    return result.data as RemoteItem[]
  })
  const loanItems = await paged(async (from, to) => {
    const result = await client.from('loan_items')
      .select('loan_id, item_id, quantity, loans:loans(user_id, delivery_date)')
      .order('id', { ascending: true }).range(from, to)
    if (result.error) throw new Error('Independent loan item read failed')
    return result.data as unknown as Array<{
      loan_id: string
      item_id: string | null
      quantity: number
      loans: { user_id: string; delivery_date: string | null } | Array<{ user_id: string; delivery_date: string | null }> | null
    }>
  })

  const rows = new Map<string, ExpectedRow>()
  for (const item of items) rows.set(item.id, {
    ...item, quantity: 0, uniqueLoans: 0, lastUsage: null,
    usage30: 0, usage90: 0, usage365: 0,
    demandStock90: null, users: new Set<string>(),
  })
  const loansByItem = new Map<string, Set<string>>()
  for (const entry of loanItems) {
    if (!entry.item_id) continue
    const loan = Array.isArray(entry.loans) ? entry.loans[0] : entry.loans
    if (!loan?.delivery_date || !loan.user_id || entry.quantity <= 0) continue
    const row = rows.get(entry.item_id)
    if (!row) continue
    const date = new Date(loan.delivery_date)
    if (!Number.isFinite(date.getTime()) || date > now) continue
    row.quantity += entry.quantity
    row.users.add(loan.user_id)
    const loans = loansByItem.get(entry.item_id) ?? new Set<string>()
    loans.add(entry.loan_id)
    loansByItem.set(entry.item_id, loans)
    if (!row.lastUsage || date > new Date(row.lastUsage)) row.lastUsage = date.toISOString()
    const age = now.getTime() - date.getTime()
    if (age <= 30 * dayMs) row.usage30 += entry.quantity
    if (age <= 90 * dayMs) row.usage90 += entry.quantity
    if (age <= 365 * dayMs) row.usage365 += entry.quantity
  }
  for (const [id, row] of rows) {
    row.uniqueLoans = loansByItem.get(id)?.size ?? 0
    row.demandStock90 = row.stock_total > 0 ? Number((row.usage90 / row.stock_total).toFixed(2)) : null
  }

  const sorted = [...rows.values()].sort((a, b) =>
    b.quantity - a.quantity || b.uniqueLoans - a.uniqueLoans || a.name.localeCompare(b.name, 'es')
  )
  const userIds = [...new Set(sorted.flatMap((row) => [...row.users]))]
  const profiles = userIds.length === 0 ? [] : await paged(async (from, to) => {
    const result = await client.from('profiles').select('id, full_name, email')
      .in('id', userIds).order('id', { ascending: true }).range(from, to)
    if (result.error) throw new Error('Independent privacy read failed')
    return result.data as Array<{ id: string; full_name: string | null; email: string | null }>
  })
  return { rows: sorted, profiles }
}

async function paged<T>(read: (from: number, to: number) => Promise<T[]>) {
  const size = 1000
  const result: T[] = []
  for (let from = 0; ; from += size) {
    const page = await read(from, from + size - 1)
    result.push(...page)
    if (page.length < size) return result
  }
}
