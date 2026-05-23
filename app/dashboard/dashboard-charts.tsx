'use client'

import {
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
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


function hasChartData(data: { value: number }[]) {
  return data.some((item) => item.value > 0)
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return <div className="h-80 min-h-80 overflow-x-auto">{children}</div>
}

function EmptyChartState() {
  return (
    <div className="flex h-full min-h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
      Sin datos para mostrar
    </div>
  )
}

export function DashboardCharts({
  loanStatusData,
  movementTypeData,
  maintenanceData,
}: DashboardChartsProps) {
  const hasLoanStatusData = hasChartData(loanStatusData)
  const hasMovementTypeData = hasChartData(movementTypeData)
  const hasMaintenanceData = maintenanceData ? hasChartData(maintenanceData) : false

  return (
    <div className="grid min-w-0 xl:grid-cols-2 gap-8 mb-8">
      <div className="min-w-0 rounded-2xl bg-white shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Préstamos por estado</h2>
        <ChartFrame>
          {hasLoanStatusData ? (
            <PieChart width={520} height={320}>
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
          ) : (
            <EmptyChartState />
          )}
        </ChartFrame>
      </div>

  {maintenanceData && (
    <div className="min-w-0 rounded-2xl bg-white shadow p-6 xl:col-span-2">
      <h2 className="text-xl font-semibold mb-4">
        Mantenimiento Preventivo vs Correctivo
      </h2>

      <ChartFrame>
        {hasMaintenanceData && maintenanceData ? (
          <PieChart width={520} height={320}>
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
        ) : (
          <EmptyChartState />
        )}
      </ChartFrame>
    </div>
  )}

      <div className="min-w-0 rounded-2xl bg-white shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Movimientos por tipo</h2>
        <ChartFrame>
          {hasMovementTypeData ? (
            <BarChart width={520} height={320} data={movementTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Cantidad de movimientos" />
            </BarChart>
          ) : (
            <EmptyChartState />
          )}
        </ChartFrame>
      </div>
    </div>
  )
}