'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'

type ChartDatum = { name: string; value: number }
type RankingDatum = ChartDatum & { code: string }

export function AnalyticsCharts({
  topItems,
  monthlyUsage,
  distribution,
  ranking,
}: {
  topItems: RankingDatum[]
  monthlyUsage: ChartDatum[]
  distribution: ChartDatum[]
  ranking: 'most' | 'least'
}) {
  const colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#64748b']
  const rankingHeight = Math.max(320, topItems.length * 46 + 64)

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="surface-card min-w-0 p-5">
        <h2 className="font-semibold">
          {ranking === 'least'
            ? '10 bienes con menor uso'
            : '10 bienes con mayor uso'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Cantidad basada en unidades entregadas durante el período seleccionado.
        </p>
        <div className="mt-4" style={{ height: rankingHeight }}>
          {topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 320 }}>
              <BarChart data={topItems} layout="vertical" margin={{ left: 8, right: 48 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="code" type="category" width={100} />
                <Tooltip content={RankingTooltip} />
                <Bar dataKey="value" name="Unidades entregadas" fill="#2563eb">
                  <LabelList dataKey="value" position="right" className="fill-slate-700 text-xs font-semibold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </section>

      <section className="surface-card min-w-0 p-5">
        <h2 className="font-semibold">Evolución mensual</h2>
        <div className="mt-4 h-80">
          {monthlyUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 320 }}>
              <BarChart data={monthlyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Unidades prestadas" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </section>

      <section className="surface-card min-w-0 p-5 xl:col-span-2">
        <h2 className="font-semibold">Distribución de señales administrativas</h2>
        <div className="mt-4 h-80">
          {distribution.some((entry) => entry.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 320 }}>
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" outerRadius={105} label>
                  {distribution.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </section>
    </div>
  )
}

function RankingTooltip({ active, payload }: TooltipContentProps) {
  const item = payload?.[0]?.payload as RankingDatum | undefined

  if (!active || !item) return null

  return (
    <div className="max-w-xs rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg">
      <p className="font-semibold text-slate-900">{item.code}</p>
      <p className="mt-1 text-slate-600">{item.name}</p>
      <p className="mt-2 text-blue-700">
        Unidades entregadas: <strong>{item.value}</strong>
      </p>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
      Sin datos para los filtros seleccionados.
    </div>
  )
}
