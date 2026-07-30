import ExcelJS from 'exceljs'
import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/supabase/auth/get-auth-profile'
import { canSeeReportsModule } from '@/lib/supabase/auth/roles'
import { parseReportPeriod } from '@/lib/report-period'
import { getVisibleRequestStatus } from '@/lib/request-delivery-status'
import { getEffectiveLoanStatus } from '@/lib/loan-status'
import {
  formatItemType,
  formatInventoryStatus,
  formatLoanStatus,
  formatMaintenanceType,
  formatMovementType,
  formatRequestStatus,
} from '@/lib/status-format'
import { firstOrNull } from '@/lib/supabase/query-utils'
import { formatDateTime } from '@/lib/format-date'


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
  const requestedModule = searchParams.get('module') ?? 'all'
  const allowedModules = new Set([
    'all',
    'requests',
    'loans',
    'returns',
    'maintenance',
    'movements',
    'inventory',
  ])
  const reportModule = allowedModules.has(requestedModule) ? requestedModule : 'all'
  const includeModule = (moduleName: string) =>
    reportModule === 'all' || reportModule === moduleName

  const workbook = new ExcelJS.Workbook()

  const formatExportRequestStatus = (requestEntry: {
    status: string | null
    request_items?:
      | {
          quantity_approved: number
          quantity_delivered: number
        }[]
      | null
    request_groups?:
      | {
          request_group_items?:
            | { item_id: string | null; quantity: number }[]
            | null
        }[]
      | null
    loans?:
      | { loan_items?: { item_id: string | null; quantity: number }[] | null }
      | { loan_items?: { item_id: string | null; quantity: number }[] | null }[]
      | null
  }) => {
    const visibleStatus = getVisibleRequestStatus(requestEntry)

    return formatRequestStatus(visibleStatus)
  }



  if (includeModule('maintenance')) {
    const { data: maintenance, error: maintenanceError } = await supabase
      .from('maintenance_records')
      .select(`
        activity,
        responsible,
        maintenance_date,
        created_at,
        maintenance_type,
        observations,
        items:items(name, code)
      `)
      .gte('maintenance_date', startDate)
      .lt('maintenance_date', endDate)
      .order('maintenance_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (maintenanceError) {
      return new Response('No se pudo cargar el mantenimiento', { status: 500 })
    }

    const maintenanceSheet = workbook.addWorksheet('Mantenimiento')

    maintenanceSheet.columns = [
      { header: 'Equipo', key: 'equipment', width: 30 },
      { header: 'Código', key: 'code', width: 18 },
      { header: 'Actividad', key: 'activity', width: 35 },
      { header: 'Responsable', key: 'responsible', width: 30 },
      { header: 'Fecha', key: 'date', width: 18 },
      { header: 'Registrado', key: 'createdAt', width: 22 },
      { header: 'Tipo', key: 'type', width: 18 },
      { header: 'Observaciones', key: 'observations', width: 40 },
    ]

    for (const record of maintenance ?? []) {
      const item = firstOrNull(record.items)

      maintenanceSheet.addRow({
        equipment: item?.name ?? 'Trabajo general',
        code: item?.code ?? '-',
        activity: record.activity,
        responsible: record.responsible,
        date: record.maintenance_date,
        createdAt: record.created_at ? formatDateTime(record.created_at) : '-',
        type: formatMaintenanceType(record.maintenance_type),
        observations: record.observations ?? '-',
      })
    }
  }

  if (includeModule('loans')) {
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
      .order('delivery_date', { ascending: false })

    if (loansError) {
      return new Response('No se pudieron cargar los préstamos', { status: 500 })
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
        status: formatLoanStatus(
          getEffectiveLoanStatus(loan.status, loan.expected_return_date)
        ),
      })
    }
  }

  if (includeModule('requests')) {
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select(`
        id,
        requested_at,
        status,
        purpose,
        scheduled_return_date,
        profiles:profiles!requests_user_id_fkey(full_name, email),
        request_items(quantity_approved, quantity_delivered),
        request_groups(request_group_items(item_id, quantity)),
        loans(loan_items(item_id, quantity))
      `)
      .gte('requested_at', startTimestamp)
      .lt('requested_at', endTimestamp)
      .order('requested_at', { ascending: true })

    if (requestsError) {
      return new Response('No se pudieron cargar las solicitudes', { status: 500 })
    }

    const requestsSheet = workbook.addWorksheet('Solicitudes')
    requestsSheet.columns = [
      { header: 'Usuario', key: 'user', width: 30 },
      { header: 'Correo', key: 'email', width: 30 },
      { header: 'Fecha', key: 'date', width: 22 },
      { header: 'Estado', key: 'status', width: 22 },
      { header: 'Devolución programada', key: 'scheduledReturnDate', width: 24 },
      { header: 'Propósito', key: 'purpose', width: 45 },
    ]

    for (const requestEntry of requests ?? []) {
      const requester = firstOrNull(requestEntry.profiles)
      requestsSheet.addRow({
        user: requester?.full_name ?? '-',
        email: requester?.email ?? '-',
        date: requestEntry.requested_at ?? '-',
        status: formatExportRequestStatus(requestEntry),
        scheduledReturnDate: requestEntry.scheduled_return_date ?? '-',
        purpose: requestEntry.purpose ?? '-',
      })
    }
  }

  if (includeModule('returns')) {
    const { data: returns, error: returnsError } = await supabase
      .from('return_items')
      .select(`
        quantity_ok,
        quantity_damaged,
        quantity_missing,
        notes,
        created_at,
        returns:returns(received_at),
        loan_items:loan_items(
          items:items(name, code),
          loans:loans(profiles:profiles!loans_user_id_fkey(full_name, email))
        )
      `)
      .gte('created_at', startTimestamp)
      .lt('created_at', endTimestamp)
      .order('created_at', { ascending: false })

    if (returnsError) {
      return new Response('No se pudieron cargar las devoluciones', { status: 500 })
    }

    const returnsSheet = workbook.addWorksheet('Devoluciones')
    returnsSheet.columns = [
      { header: 'Ítem', key: 'item', width: 30 },
      { header: 'Código', key: 'code', width: 18 },
      { header: 'Usuario', key: 'user', width: 30 },
      { header: 'Fecha', key: 'date', width: 22 },
      { header: 'OK', key: 'ok', width: 10 },
      { header: 'Dañados', key: 'damaged', width: 10 },
      { header: 'Faltantes', key: 'missing', width: 10 },
      { header: 'Notas', key: 'notes', width: 40 },
    ]

    for (const returnEntry of returns ?? []) {
      const returnRecord = firstOrNull(returnEntry.returns)
      const loanItem = firstOrNull(returnEntry.loan_items)
      const item = firstOrNull(loanItem?.items)
      const loan = firstOrNull(loanItem?.loans)
      const borrower = firstOrNull(loan?.profiles)

      returnsSheet.addRow({
        item: item?.name ?? '-',
        code: item?.code ?? '-',
        user: borrower?.full_name ?? '-',
        date: returnRecord?.received_at ?? returnEntry.created_at ?? '-',
        ok: returnEntry.quantity_ok,
        damaged: returnEntry.quantity_damaged,
        missing: returnEntry.quantity_missing,
        notes: returnEntry.notes ?? '-',
      })
    }
  }

  if (includeModule('movements')) {
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select(`
        movement_type,
        quantity,
        notes,
        created_at,
        items:items(name, code),
        profiles:profiles!inventory_movements_created_by_fkey(full_name, email)
      `)
      .gte('created_at', startTimestamp)
      .lt('created_at', endTimestamp)
      .order('created_at', { ascending: false })

    if (movementsError) {
      return new Response('No se pudieron cargar los movimientos', { status: 500 })
    }

    const movementsSheet = workbook.addWorksheet('Movimientos')
    movementsSheet.columns = [
      { header: 'Fecha', key: 'date', width: 22 },
      { header: 'Tipo', key: 'type', width: 22 },
      { header: 'Ítem', key: 'item', width: 30 },
      { header: 'Código', key: 'code', width: 18 },
      { header: 'Cantidad', key: 'quantity', width: 12 },
      { header: 'Usuario', key: 'user', width: 30 },
      { header: 'Notas', key: 'notes', width: 40 },
    ]

    for (const movement of movements ?? []) {
      const item = firstOrNull(movement.items)
      const movementUser = firstOrNull(movement.profiles)
      movementsSheet.addRow({
        date: movement.created_at,
        type: formatMovementType(movement.movement_type),
        item: item?.name ?? '-',
        code: item?.code ?? '-',
        quantity: movement.quantity,
        user: movementUser?.full_name ?? 'Sistema',
        notes: movement.notes ?? '-',
      })
    }
  }

  if (includeModule('inventory')) {
    const { data: inventory, error: inventoryError } = await supabase
      .from('items')
      .select('code, name, category, item_type, stock_total, stock_available, status, location')
      .order('category', { ascending: true })
      .order('name', { ascending: true })
      .order('code', { ascending: true })

    if (inventoryError) {
      return new Response('No se pudo cargar el inventario', { status: 500 })
    }

    const inventorySheet = workbook.addWorksheet('Inventario')
    inventorySheet.columns = [
      { header: 'Código', key: 'code', width: 18 },
      { header: 'Nombre', key: 'name', width: 35 },
      { header: 'Categoría', key: 'category', width: 24 },
      { header: 'Tipo', key: 'type', width: 16 },
      { header: 'Stock total', key: 'stockTotal', width: 14 },
      { header: 'Disponible', key: 'available', width: 14 },
      { header: 'Estado', key: 'status', width: 16 },
      { header: 'Ubicación', key: 'location', width: 22 },
    ]

    for (const item of inventory ?? []) {
      inventorySheet.addRow({
        code: item.code,
        name: item.name,
        category: item.category ?? '-',
        type: formatItemType(item.item_type),
        stockTotal: item.stock_total,
        available: item.stock_available,
        status: formatInventoryStatus(item.status),
        location: item.location ?? '-',
      })
    }
  }

  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_${reportModule}_${month}_${year}.xlsx"`,
    },
  })
}
