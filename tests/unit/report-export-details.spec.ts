import { expect, test } from '@playwright/test'
import ExcelJS from 'exceljs'
import {
  configureDetailedExportSheet,
  exportText,
  formatLoanPurpose,
  summarizeDeliveredItems,
  summarizeRequestedItems,
} from '../../lib/report-export-details'

test.describe('detalle de exportaciones Excel', () => {
  test('consolida bienes solicitados usando exclusivamente quantity_requested', () => {
    const summary = summarizeRequestedItems([
      {
        item_id: 'osc',
        quantity_requested: 2,
        items: { code: 'OSC-001', name: 'Osciloscopio' },
      },
      {
        item_id: 'multi',
        quantity_requested: 3,
        items: [{ code: 'MUL-004', name: 'Multímetro digital' }],
      },
    ])

    expect(summary).toEqual({
      items: 'Osciloscopio (2)\nMultímetro digital (3)',
      codes: 'OSC-001\nMUL-004',
      totalQuantity: 5,
    })
  })

  test('consolida filas repetidas sin duplicar el bien y conserva el orden', () => {
    const summary = summarizeRequestedItems([
      {
        item_id: 'osc',
        quantity_requested: 1,
        items: { code: 'OSC-001', name: 'Osciloscopio' },
      },
      {
        item_id: 'osc',
        quantity_requested: 2,
        items: { code: 'OSC-001', name: 'Osciloscopio' },
      },
    ])

    expect(summary.items).toBe('Osciloscopio (3)')
    expect(summary.codes).toBe('OSC-001')
    expect(summary.totalQuantity).toBe(3)
  })

  test('resume bienes entregados e incluye solo códigos patrimoniales presentes', () => {
    const summary = summarizeDeliveredItems([
      {
        item_id: 'osc',
        quantity: 1,
        items: { code: 'OSC-001', name: 'Osciloscopio' },
        item_units: { asset_code: 'UCU-000245' },
      },
      {
        item_id: 'osc',
        quantity: 1,
        items: { code: 'OSC-001', name: 'Osciloscopio' },
        item_units: [{ asset_code: 'UCU-000246' }],
      },
      {
        item_id: 'multi',
        quantity: 2,
        items: { code: 'MUL-004', name: 'Multímetro digital' },
        item_units: null,
      },
    ])

    expect(summary).toEqual({
      items: 'Osciloscopio (2)\nMultímetro digital (2)',
      codes:
        'OSC-001 — Patrimonial: UCU-000245, UCU-000246\nMUL-004',
      totalQuantity: 4,
    })
  })

  test('distingue préstamos directos y normaliza valores vacíos', () => {
    expect(formatLoanPurpose(null)).toBe('Préstamo directo')
    expect(formatLoanPurpose({ purpose: '  Práctica de control  ' })).toBe(
      'Práctica de control'
    )
    expect(formatLoanPurpose({ purpose: null })).toBe('—')
    expect(exportText('   ')).toBe('—')
    expect(summarizeDeliveredItems(null)).toEqual({
      items: '—',
      codes: '—',
      totalQuantity: 0,
    })
  })

  test('genera un workbook imprimible con filtro, encabezado fijo y listas multilínea', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Solicitudes')
    sheet.columns = [
      { header: 'Usuario', key: 'user', width: 30 },
      { header: 'Bienes solicitados', key: 'items', width: 34 },
      { header: 'Códigos', key: 'codes', width: 22 },
      { header: 'Observaciones', key: 'comments', width: 34 },
    ]
    sheet.addRow({
      user: 'Usuario institucional',
      items: 'Osciloscopio (2)\nMultímetro digital (3)',
      codes: 'OSC-001\nMUL-004',
      comments: '—',
    })
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    configureDetailedExportSheet(sheet, ['items', 'codes', 'comments'])

    const buffer = await workbook.xlsx.writeBuffer()
    const restoredWorkbook = new ExcelJS.Workbook()
    await restoredWorkbook.xlsx.load(buffer)
    const restoredSheet = restoredWorkbook.getWorksheet('Solicitudes')

    expect(restoredSheet).toBeTruthy()
    expect(restoredSheet?.autoFilter).toEqual('A1:D1')
    expect(restoredSheet?.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(restoredSheet?.pageSetup.orientation).toBe('landscape')
    expect(restoredSheet?.getCell('B2').alignment).toMatchObject({
      vertical: 'top',
      wrapText: true,
    })
    expect(restoredSheet?.getRow(2).height).toBeGreaterThanOrEqual(30)

    const outputPath = process.env.TEST_EXCEL_PATH
    if (outputPath) await workbook.xlsx.writeFile(outputPath)
  })
})
