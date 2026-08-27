import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canSeeReportsModule, getHomeRouteByRole } from '@/lib/supabase/auth/roles'
import {
  filterItemUsageRows,
  type AnalyticsPeriod,
  type ItemUsageRow,
} from '@/lib/item-usage-analytics'
import { formatDateTime } from '@/lib/format-date'
import { loadItemUsageAnalytics } from './data'
import { AnalyticsCharts } from './analytics-charts'
import { PageHeader } from '@/components/page-header'

type SearchParams = Promise<{
  period?: string
  q?: string
  category?: string
  status?: string
  unused?: string
  ranking?: string
}>

function parsePeriod(value?: string): AnalyticsPeriod {
  return value === '30' || value === '90' || value === '365' ? value : 'all'
}

function indicatorClass(indicator: ItemUsageRow['indicator']) {
  if (indicator === 'ALTA DEMANDA') return 'bg-blue-100 text-blue-800'
  if (indicator === 'USO RECIENTE') return 'bg-emerald-100 text-emerald-800'
  if (indicator === 'BAJA ROTACIÓN') return 'bg-amber-100 text-amber-800'
  if (indicator === 'SIN USO REGISTRADO') return 'bg-slate-200 text-slate-700'
  return 'bg-violet-100 text-violet-800'
}

export default async function ItemAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  let auth
  try {
    auth = await getAuthProfile()
  } catch {
    redirect('/auth/login')
  }
  if (!canSeeReportsModule(auth.profile.role)) {
    redirect(getHomeRouteByRole(auth.profile.role))
  }

  const params = await searchParams
  const period = parsePeriod(params.period)
  const analytics = await loadItemUsageAnalytics(auth.supabase, { now: new Date(), period })
  const rows = filterItemUsageRows(analytics.rows, {
    search: params.q,
    category: params.category,
    status: params.status,
    onlyUnused: params.unused === '1',
    ranking: params.ranking === 'least' ? 'least' : 'most',
  })
  const categories = [...new Set(analytics.rows.map((row) => row.category).filter(Boolean))]
    .sort((a, b) => (a ?? '').localeCompare(b ?? '', 'es')) as string[]
  const totalQuantity = rows.reduce((total, row) => total + row.totalQuantity, 0)
  const activeItems = rows.filter((row) => row.totalQuantity > 0).length
  const unusedItems = rows.filter((row) => row.historicalQuantity === 0).length
  const topItems = rows.filter((row) => row.totalQuantity > 0).slice(0, 10)
    .map((row) => ({ name: row.name, value: row.totalQuantity }))
  const monthlyMap = new Map<string, number>()
  for (const row of rows) {
    for (const [month, value] of Object.entries(row.monthlyUsage)) {
      monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + value)
    }
  }
  const monthlyUsage = [...monthlyMap.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({ name, value }))
  const distribution = [...new Set(analytics.rows.map((row) => row.indicator))].map((indicator) => ({
    name: indicator,
    value: rows.filter((row) => row.indicator === indicator).length,
  }))
  const exportParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) exportParams.set(key, value)

  return (
    <main className="app-page">
      <div className="app-container space-y-6">
        <PageHeader
          eyebrow="Inteligencia operativa"
          title="Analítica de uso de bienes"
          description="Señales basadas en préstamos efectivamente entregados. Orientan la revisión administrativa, pero no determinan por sí solas compras, renovación u obsolescencia."
          actions={<>
            <Link href={`/dashboard/analitica/export?${exportParams}`} className="rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-800">
              Exportar Excel
            </Link>
            <Link href="/dashboard" className="rounded-lg bg-slate-800 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-900">
              Volver al dashboard
            </Link>
          </>}
        />

        <form className="surface-card grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-sm font-medium">Periodo
            <select name="period" defaultValue={period} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option>
              <option value="365">Último año</option><option value="all">Histórico</option>
            </select>
          </label>
          <label className="text-sm font-medium xl:col-span-2">Buscar
            <input name="q" type="search" defaultValue={params.q ?? ''} placeholder="Código, bien, categoría o ubicación" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="text-sm font-medium">Categoría
            <select name="category" defaultValue={params.category ?? ''} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="">Todas</option>{categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Estado
            <select name="status" defaultValue={params.status ?? ''} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="">Todos</option><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="maintenance">Mantenimiento</option>
            </select>
          </label>
          <label className="text-sm font-medium">Ranking
            <select name="ranking" defaultValue={params.ranking === 'least' ? 'least' : 'most'} className="mt-1 w-full rounded-lg border px-3 py-2">
              <option value="most">Mayor uso</option><option value="least">Menor uso</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="unused" value="1" defaultChecked={params.unused === '1'} /> Solo bienes sin uso registrado
          </label>
          <div className="flex gap-2 md:col-span-2 xl:col-span-4 xl:justify-end">
            <Link href="/dashboard/analitica" className="rounded-lg border px-4 py-2 text-sm">Limpiar</Link>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Aplicar filtros</button>
          </div>
        </form>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Bienes visibles" value={rows.length} />
          <MetricCard label="Unidades prestadas" value={totalQuantity} />
          <MetricCard label="Bienes con uso en periodo" value={activeItems} />
          <MetricCard label="Sin uso histórico" value={unusedItems} />
        </section>

        <AnalyticsCharts topItems={topItems} monthlyUsage={monthlyUsage} distribution={distribution} />

        <section className="surface-card overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">Detalle por bien</h2>
            <p className="text-sm text-slate-500">Usuarios distintos se presenta solo como conteo; no se exponen identidades.</p>
          </div>
          <div className="overflow-x-auto" role="region" aria-label="Tabla de uso de bienes" tabIndex={0}>
            <table className="min-w-[1250px] w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600"><tr>
                {['Código / bien', 'Categoría', 'Stock', 'Préstamos', 'Cantidad', 'Usuarios', 'Último uso', 'Días', '30d', '90d', '365d', 'Tendencia', 'Señal'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}
              </tr></thead>
              <tbody className="divide-y">
                {rows.map((row) => <tr key={row.id}>
                  <td className="px-4 py-3"><span className="font-medium">{row.name}</span><span className="block text-xs text-slate-500">{row.code}</span></td>
                  <td className="px-4 py-3">{row.category ?? '-'}</td>
                  <td className="px-4 py-3">{row.stockAvailable} / {row.stockTotal}</td>
                  <td className="px-4 py-3">{row.loanCount}</td><td className="px-4 py-3">{row.totalQuantity}</td>
                  <td className="px-4 py-3">{row.distinctUsers}</td>
                  <td className="px-4 py-3">{row.lastUsedAt ? formatDateTime(row.lastUsedAt) : 'Nunca'}</td>
                  <td className="px-4 py-3">{row.daysSinceLastUse ?? '-'}</td><td className="px-4 py-3">{row.usage30}</td>
                  <td className="px-4 py-3">{row.usage90}</td><td className="px-4 py-3">{row.usage365}</td><td className="px-4 py-3">{row.recentTrend}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${indicatorClass(row.indicator)}`}>{row.indicator}</span></td>
                </tr>)}
                {rows.length === 0 && <tr><td colSpan={13} className="px-4 py-10 text-center text-slate-500">No hay bienes que coincidan con los filtros.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        {analytics.ignoredEventCount > 0 && <p className="text-xs text-amber-700">Se omitieron {analytics.ignoredEventCount} registros históricos con fecha o cantidad inválida.</p>}
      </div>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <div className="surface-card p-5"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p></div>
}
