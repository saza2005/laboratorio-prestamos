'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ChartDatum = { name: string; value: number }

export function AnalyticsCharts({
  topItems,
  monthlyUsage,
  distribution,
}: {
  topItems: ChartDatum[]
  monthlyUsage: ChartDatum[]
  distribution: ChartDatum[]
}) {
  const colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#64748b']

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="surface-card min-w-0 p-5">
        <h2 className="font-semibold">Top 10 por cantidad prestada</h2>
        <div className="mt-4 h-80">
          {topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 320 }}>
              <BarChart data={topItems} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={130} />
                <Tooltip />
                <Bar dataKey="value" name="Unidades prestadas" fill="#2563eb" />
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

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
      Sin datos para los filtros seleccionados.
    </div>
  )
}
