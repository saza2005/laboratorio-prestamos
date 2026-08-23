import { normalizeSearchText } from '@/lib/item-format'

export type AnalyticsPeriod = '30' | '90' | '365' | 'all'

export type AnalyticsInventoryItem = {
  id: string
  code: string
  name: string
  category: string | null
  itemType: string | null
  stockTotal: number
  stockAvailable: number
  status: string
  location: string | null
}

export type AnalyticsUsageEvent = {
  loanId: string
  itemId: string
  userId: string
  quantity: number
  usedAt: string
}

export type UsageIndicator =
  | 'ALTA DEMANDA'
  | 'BAJA ROTACIÓN'
  | 'SIN USO REGISTRADO'
  | 'USO RECIENTE'
  | 'USO HISTÓRICO'

export type ItemUsageRow = AnalyticsInventoryItem & {
  loanCount: number
  totalQuantity: number
  distinctUsers: number
  lastUsedAt: string | null
  daysSinceLastUse: number | null
  usage30: number
  usage90: number
  usage365: number
  historicalQuantity: number
  averageLoansPerMonth: number
  demandStockRatio90: number | null
  recentTrend: 'AL ALZA' | 'A LA BAJA' | 'ESTABLE' | 'SIN DATOS'
  indicator: UsageIndicator
  monthlyUsage: Record<string, number>
}

export type UsageAnalytics = {
  rows: ItemUsageRow[]
  ignoredEventCount: number
}

const DAY_MS = 86_400_000

function daysBefore(now: Date, days: number) {
  return now.getTime() - days * DAY_MS
}

function isInsideWindow(date: Date, now: Date, days: number) {
  const time = date.getTime()
  return time <= now.getTime() && time >= daysBefore(now, days)
}

function periodDays(period: AnalyticsPeriod) {
  return period === 'all' ? null : Number(period)
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7)
}

export function buildItemUsageAnalytics(
  items: AnalyticsInventoryItem[],
  events: AnalyticsUsageEvent[],
  options: { now: Date; period: AnalyticsPeriod }
): UsageAnalytics {
  const byItem = new Map<string, AnalyticsUsageEvent[]>()
  let ignoredEventCount = 0

  for (const event of events) {
    const usedAt = new Date(event.usedAt)
    if (
      !Number.isFinite(usedAt.getTime()) ||
      !Number.isInteger(event.quantity) ||
      event.quantity <= 0
    ) {
      ignoredEventCount += 1
      continue
    }
    const current = byItem.get(event.itemId) ?? []
    current.push(event)
    byItem.set(event.itemId, current)
  }

  const selectedDays = periodDays(options.period)
  const rows = items.map((item): ItemUsageRow => {
    const historicalEvents = (byItem.get(item.id) ?? []).filter(
      (event) => new Date(event.usedAt).getTime() <= options.now.getTime()
    )
    const selectedEvents = selectedDays === null
      ? historicalEvents
      : historicalEvents.filter((event) =>
          isInsideWindow(new Date(event.usedAt), options.now, selectedDays)
        )
    const dates = historicalEvents.map((event) => new Date(event.usedAt))
    const lastUsed = dates.length > 0
      ? new Date(Math.max(...dates.map((date) => date.getTime())))
      : null
    const quantityIn = (days: number) => historicalEvents.reduce(
      (total, event) => total + (
        isInsideWindow(new Date(event.usedAt), options.now, days) ? event.quantity : 0
      ),
      0
    )
    const usage30 = quantityIn(30)
    const usage90 = quantityIn(90)
    const usage365 = quantityIn(365)
    const previous30 = historicalEvents.reduce((total, event) => {
      const time = new Date(event.usedAt).getTime()
      return total + (
        time < daysBefore(options.now, 30) && time >= daysBefore(options.now, 60)
          ? event.quantity
          : 0
      )
    }, 0)
    const historicalQuantity = historicalEvents.reduce(
      (total, event) => total + event.quantity,
      0
    )
    const uniqueLoans = new Set(selectedEvents.map((event) => event.loanId))
    const firstUsed = dates.length > 0
      ? Math.min(...dates.map((date) => date.getTime()))
      : null
    const activeMonths = firstUsed === null
      ? 0
      : Math.max(1, Math.ceil((options.now.getTime() - firstUsed) / (30.4375 * DAY_MS)))
    const monthlyUsage: Record<string, number> = {}
    for (const event of selectedEvents) {
      const key = monthKey(new Date(event.usedAt))
      monthlyUsage[key] = (monthlyUsage[key] ?? 0) + event.quantity
    }

    let indicator: UsageIndicator
    if (historicalQuantity === 0) indicator = 'SIN USO REGISTRADO'
    else if (item.stockTotal > 0 && usage30 >= item.stockTotal) indicator = 'ALTA DEMANDA'
    else if (usage90 > 0) indicator = 'USO RECIENTE'
    else if (usage365 === 0) indicator = 'BAJA ROTACIÓN'
    else indicator = 'USO HISTÓRICO'

    return {
      ...item,
      loanCount: uniqueLoans.size,
      totalQuantity: selectedEvents.reduce((total, event) => total + event.quantity, 0),
      distinctUsers: new Set(selectedEvents.map((event) => event.userId)).size,
      lastUsedAt: lastUsed?.toISOString() ?? null,
      daysSinceLastUse: lastUsed
        ? Math.max(0, Math.floor((options.now.getTime() - lastUsed.getTime()) / DAY_MS))
        : null,
      usage30,
      usage90,
      usage365,
      historicalQuantity,
      averageLoansPerMonth: activeMonths > 0
        ? Number((new Set(historicalEvents.map((event) => event.loanId)).size / activeMonths).toFixed(2))
        : 0,
      demandStockRatio90: item.stockTotal > 0
        ? Number((usage90 / item.stockTotal).toFixed(2))
        : null,
      recentTrend: usage30 === 0 && previous30 === 0
        ? 'SIN DATOS'
        : usage30 > previous30
          ? 'AL ALZA'
          : usage30 < previous30
            ? 'A LA BAJA'
            : 'ESTABLE',
      indicator,
      monthlyUsage,
    }
  })

  rows.sort((a, b) =>
    b.totalQuantity - a.totalQuantity ||
    b.loanCount - a.loanCount ||
    a.name.localeCompare(b.name, 'es')
  )

  return { rows, ignoredEventCount }
}

export function filterItemUsageRows(
  rows: ItemUsageRow[],
  filters: {
    search?: string
    category?: string
    status?: string
    onlyUnused?: boolean
    ranking?: 'most' | 'least'
  }
) {
  const search = normalizeSearchText(filters.search)
  const filtered = rows.filter((row) => {
    const matchesSearch = !search || normalizeSearchText(
      `${row.code} ${row.name} ${row.category ?? ''} ${row.location ?? ''}`
    ).includes(search)
    return matchesSearch &&
      (!filters.category || row.category === filters.category) &&
      (!filters.status || row.status === filters.status) &&
      (!filters.onlyUnused || row.historicalQuantity === 0)
  })

  return [...filtered].sort((a, b) => {
    if (filters.ranking === 'least') {
      return a.totalQuantity - b.totalQuantity || a.name.localeCompare(b.name, 'es')
    }
    return b.totalQuantity - a.totalQuantity || a.name.localeCompare(b.name, 'es')
  })
}
