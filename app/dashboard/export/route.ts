import ExcelJS from 'exceljs'
import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canSeeReportsModule } from '@/lib/supabase/auth/roles'
import { parseReportPeriod } from '@/lib/report-period'

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function GET(request: NextRequest) {
  let auth

  try {
    auth = await getAuthProfile()
  } catch {
    return new Response('No autenticado', { status: 401 })
  }

  const { supabase, profile } = auth

  if (!canSeeReportsModule(profile.role)) {
    return new Response('No autorizado', { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const period = parseReportPeriod(
    searchParams.get('month'),
    searchParams.get('year')
  )

  if (!period) {
    return new Response('Mes o año no válido', { status: 400 })
  }

  const { month, year, startDate, endDate, startTimestamp, endTimestamp } = period

  const { data: maintenance, error: maintenanceError } = await supabase
    .from('maintenance_records')
    .select(`
      activity,
      responsible,
      maintenance_date,
      maintenance_type,
      observations,
      items:items(name, code)
    `)
    .gte('maintenance_date', startDate)
    .lt('maintenance_date', endDate)

  if (maintenanceError) {
    return new Response('No se pudo cargar el mantenimiento', { status: 500 })
  }

  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select(`
      id,
      status,
      delivery_date,
      expected_return_date,
      returned_at,
      profiles:profiles!loans_user_id_fkey(full_name, email)
    `)
    .gte('delivery_date', startTimestamp)
    .lt('delivery_date', endTimestamp)

  if (loansError) {
    return new Response('No se pudieron cargar los préstamos', { status: 500 })
  }

  const workbook = new ExcelJS.Workbook()

  const maintenanceSheet = workbook.addWorksheet('Mantenimiento')

  maintenanceSheet.columns = [
    { header: 'Equipo', key: 'equipment', width: 30 },
    { header: 'Código', key: 'code', width: 18 },
    { header: 'Actividad', key: 'activity', width: 35 },
    { header: 'Responsable', key: 'responsible', width: 30 },
    { header: 'Fecha', key: 'date', width: 18 },
    { header: 'Tipo', key: 'type', width: 18 },
    { header: 'Observaciones', key: 'observations', width: 40 },
  ]

  for (const record of maintenance ?? []) {
    const item = firstOrNull(record.items)

    maintenanceSheet.addRow({
      equipment: item?.name ?? '-',
      code: item?.code ?? '-',
      activity: record.activity,
      responsible: record.responsible,
      date: record.maintenance_date,
      type:
        record.maintenance_type === 'preventive'
          ? 'Preventivo'
          : 'Correctivo',
      observations: record.observations ?? '-',
    })
  }

  const loansSheet = workbook.addWorksheet('Préstamos')

  loansSheet.columns = [
    { header: 'Usuario', key: 'user', width: 30 },
    { header: 'Correo', key: 'email', width: 30 },
    { header: 'Fecha de entrega', key: 'deliveryDate', width: 22 },
    { header: 'Devolución esperada', key: 'expectedReturnDate', width: 22 },
    { header: 'Fecha devuelto', key: 'returnedAt', width: 22 },
    { header: 'Estado', key: 'status', width: 18 },
  ]

  for (const loan of loans ?? []) {
    const borrower = firstOrNull(loan.profiles)

    loansSheet.addRow({
      user: borrower?.full_name ?? '-',
      email: borrower?.email ?? '-',
      deliveryDate: loan.delivery_date ?? '-',
      expectedReturnDate: loan.expected_return_date ?? '-',
      returnedAt: loan.returned_at ?? '-',
      status: loan.status,
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_${month}_${year}.xlsx"`,
    },
  })
}