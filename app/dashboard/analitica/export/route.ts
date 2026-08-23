import ExcelJS from 'exceljs'
import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canSeeReportsModule } from '@/lib/supabase/auth/roles'
import {
  filterItemUsageRows,
  type AnalyticsPeriod,
} from '@/lib/item-usage-analytics'
import { formatDateTime } from '@/lib/format-date'
import { loadItemUsageAnalytics } from '../data'

function parsePeriod(value: string | null): AnalyticsPeriod {
  return value === '30' || value === '90' || value === '365' ? value : 'all'
}

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = await getAuthProfile()
  } catch {
    return new Response('No autenticado', { status: 401 })
  }
  if (!canSeeReportsModule(auth.profile.role)) {
    return new Response('No autorizado', { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const period = parsePeriod(params.get('period'))
  const analytics = await loadItemUsageAnalytics(auth.supabase, { now: new Date(), period })
  const rows = filterItemUsageRows(analytics.rows, {
    search: params.get('q') ?? '',
    category: params.get('category') ?? '',
    status: params.get('status') ?? '',
    onlyUnused: params.get('unused') === '1',
    ranking: params.get('ranking') === 'least' ? 'least' : 'most',
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Laboratorio - Analítica de bienes'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Uso de bienes')
  sheet.columns = [
    { header: 'Código', key: 'code', width: 18 },
    { header: 'Bien', key: 'name', width: 36 },
    { header: 'Categoría', key: 'category', width: 24 },
    { header: 'Estado', key: 'status', width: 16 },
    { header: 'Ubicación', key: 'location', width: 22 },
    { header: 'Stock total', key: 'stockTotal', width: 14 },
    { header: 'Stock disponible', key: 'stockAvailable', width: 17 },
    { header: 'Préstamos en periodo', key: 'loanCount', width: 20 },
    { header: 'Cantidad prestada en periodo', key: 'totalQuantity', width: 25 },
    { header: 'Usuarios distintos', key: 'distinctUsers', width: 18 },
    { header: 'Último uso', key: 'lastUsedAt', width: 18 },
    { header: 'Días desde último uso', key: 'daysSinceLastUse', width: 22 },
    { header: 'Uso 30 días', key: 'usage30', width: 15 },
    { header: 'Uso 90 días', key: 'usage90', width: 15 },
    { header: 'Uso 365 días', key: 'usage365', width: 16 },
    { header: 'Promedio préstamos/mes', key: 'averageLoansPerMonth', width: 23 },
    { header: 'Demanda 90d / stock', key: 'demandStockRatio90', width: 21 },
    { header: 'Tendencia reciente', key: 'recentTrend', width: 19 },
    { header: 'Indicador administrativo', key: 'indicator', width: 28 },
  ]
  for (const row of rows) {
    sheet.addRow({
      ...row,
      category: row.category ?? '-',
      location: row.location ?? '-',
      lastUsedAt: row.lastUsedAt ? formatDateTime(row.lastUsedAt) : 'Nunca',
      daysSinceLastUse: row.daysSinceLastUse ?? '-',
      demandStockRatio90: row.demandStockRatio90 ?? '-',
    })
  }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = { from: 'A1', to: 'S1' }

  const notes = workbook.addWorksheet('Metodología')
  notes.columns = [{ width: 30 }, { width: 100 }]
  notes.addRows([
    ['Evento de uso', 'Detalle de préstamo creado al entregar material (loan_items).'],
    ['Cantidad', 'Cantidad originalmente prestada; las devoluciones no se vuelven a sumar.'],
    ['Periodo', period === 'all' ? 'Histórico' : `Últimos ${period} días`],
    ['Privacidad', 'El reporte no incluye nombres, correos ni identificadores de prestatarios.'],
    ['Limitación', 'Las señales no sustituyen evaluación física, antigüedad, costos, mantenimiento u obsolescencia.'],
  ])
  notes.getColumn(1).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="analitica_uso_bienes.xlsx"',
    },
  })
}
