'use client'

import {
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'

type LoanStatusChartItem = {
  name: string
  value: number
}

type MovementTypeChartItem = {
  name: string
  value: number
}

type DashboardChartsProps = {
  loanStatusData: LoanStatusChartItem[]
  movementTypeData: MovementTypeChartItem[]
  maintenanceData?: MaintenanceChartItem[]
}

type MaintenanceChartItem = {
  name: string
  value: number
}


const PIE_COLORS = ['#2563eb', '#f59e0b', '#16a34a', '#64748b']

export function DashboardCharts({
  loanStatusData,
  movementTypeData,
  maintenanceData,
}: DashboardChartsProps) {
  return (
    <div className="grid xl:grid-cols-2 gap-8 mb-8">
      <div className="rounded-2xl bg-white shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Préstamos por estado</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={loanStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {loanStatusData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

  {maintenanceData && (
    <div className="rounded-2xl bg-white shadow p-6 xl:col-span-2">
      <h2 className="text-xl font-semibold mb-4">
        Mantenimiento Preventivo vs Correctivo
      </h2>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={maintenanceData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              label
            >
              {maintenanceData.map((entry, index) => (
                <Cell
                  key={`maintenance-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )}

      <div className="rounded-2xl bg-white shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Movimientos por tipo</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={movementTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Cantidad de movimientos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}