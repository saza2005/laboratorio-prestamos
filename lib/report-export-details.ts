import type ExcelJS from 'exceljs'

type RelatedRecord<T> = T | T[] | null | undefined

type ItemReference = {
  code?: string | null
  name?: string | null
}

type ItemUnitReference = {
  asset_code?: string | null
}

export type RequestItemExportEntry = {
  item_id?: string | null
  quantity_requested?: number | null
  items?: RelatedRecord<ItemReference>
}

export type LoanItemExportEntry = {
  item_id?: string | null
  quantity?: number | null
  items?: RelatedRecord<ItemReference>
  item_units?: RelatedRecord<ItemUnitReference>
}

export type ExportItemSummary = {
  items: string
  codes: string
  totalQuantity: number
}

export function configureDetailedExportSheet(
  sheet: ExcelJS.Worksheet,
  wrappedColumnKeys: string[]
) {
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount },
  }
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  }
  sheet.pageSetup.printTitlesRow = '1:1'

  const wrappedColumns = new Set(wrappedColumnKeys)

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    let maximumLineCount = 1
    row.alignment = { vertical: 'top' }

    for (const columnKey of wrappedColumns) {
      const cell = row.getCell(sheet.getColumn(columnKey).number)
      cell.alignment = { vertical: 'top', wrapText: true }
      maximumLineCount = Math.max(
        maximumLineCount,
        String(cell.value ?? '').split('\n').length
      )
    }

    row.height = Math.min(90, Math.max(20, maximumLineCount * 15))
  })
}

function firstRelated<T>(value: RelatedRecord<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function exportText(value: string | null | undefined, fallback = '—') {
  const normalized = value?.trim()
  return normalized ? normalized : fallback
}

export function summarizeRequestedItems(
  entries: RequestItemExportEntry[] | null | undefined
): ExportItemSummary {
  const groups = new Map<
    string,
    { name: string; code: string; quantity: number }
  >()

  for (const entry of entries ?? []) {
    const item = firstRelated(entry.items)
    const name = exportText(item?.name, 'Bien sin nombre')
    const code = exportText(item?.code)
    const quantity = Math.max(0, Number(entry.quantity_requested) || 0)
    const key = entry.item_id ?? `${code}\u0000${name}`
    const current = groups.get(key)

    if (current) {
      current.quantity += quantity
    } else {
      groups.set(key, { name, code, quantity })
    }
  }

  if (groups.size === 0) {
    return { items: '—', codes: '—', totalQuantity: 0 }
  }

  const groupedItems = [...groups.values()]

  return {
    items: groupedItems.map((item) => `${item.name} (${item.quantity})`).join('\n'),
    codes: groupedItems.map((item) => item.code).join('\n'),
    totalQuantity: groupedItems.reduce((total, item) => total + item.quantity, 0),
  }
}

export function summarizeDeliveredItems(
  entries: LoanItemExportEntry[] | null | undefined
): ExportItemSummary {
  const groups = new Map<
    string,
    { name: string; code: string; quantity: number; assetCodes: Set<string> }
  >()

  for (const entry of entries ?? []) {
    const item = firstRelated(entry.items)
    const itemUnit = firstRelated(entry.item_units)
    const name = exportText(item?.name, 'Bien sin nombre')
    const code = exportText(item?.code)
    const quantity = Math.max(0, Number(entry.quantity) || 0)
    const key = entry.item_id ?? `${code}\u0000${name}`
    const current = groups.get(key) ?? {
      name,
      code,
      quantity: 0,
      assetCodes: new Set<string>(),
    }

    current.quantity += quantity

    const assetCode = itemUnit?.asset_code?.trim()
    if (assetCode) current.assetCodes.add(assetCode)

    groups.set(key, current)
  }

  if (groups.size === 0) {
    return { items: '—', codes: '—', totalQuantity: 0 }
  }

  const groupedItems = [...groups.values()]

  return {
    items: groupedItems.map((item) => `${item.name} (${item.quantity})`).join('\n'),
    codes: groupedItems
      .map((item) => {
        const assetCodes = [...item.assetCodes]
        return assetCodes.length > 0
          ? `${item.code} — Patrimonial: ${assetCodes.join(', ')}`
          : item.code
      })
      .join('\n'),
    totalQuantity: groupedItems.reduce((total, item) => total + item.quantity, 0),
  }
}

export function formatLoanPurpose(
  request: RelatedRecord<{ purpose?: string | null }>
) {
  const relatedRequest = firstRelated(request)
  return relatedRequest ? exportText(relatedRequest.purpose) : 'Préstamo directo'
}
