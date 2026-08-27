import { expect, test } from '@playwright/test'
import { parseAssetCodes, validateAssetCodes } from '@/lib/inventory-asset-codes'

test.describe('Códigos patrimoniales al crear inventario', () => {
  test('normaliza líneas y conserva el contenido significativo', () => {
    expect(parseAssetCodes('  PAT-001\n\nPAT+002\r\n PAT-003 ')).toEqual([
      'PAT-001',
      'PAT+002',
      'PAT-003',
    ])
  })

  test('exige un código diferente por cada unidad individual', () => {
    expect(
      validateAssetCodes({
        assetCodes: ['PAT-001', 'PAT-002'],
        stockTotal: 2,
        trackIndividual: true,
      })
    ).toBeNull()

    expect(
      validateAssetCodes({
        assetCodes: ['PAT-001'],
        stockTotal: 2,
        trackIndividual: true,
      })
    ).toContain('exactamente 2')
  })

  test('rechaza duplicados sin distinguir mayúsculas', () => {
    expect(
      validateAssetCodes({
        assetCodes: ['PAT-001', 'pat-001'],
        stockTotal: 2,
        trackIndividual: true,
      })
    ).toBe('Los códigos patrimoniales no pueden repetirse.')
  })

  test('no admite códigos en materiales sin seguimiento individual', () => {
    expect(
      validateAssetCodes({
        assetCodes: ['PAT-001'],
        stockTotal: 1,
        trackIndividual: false,
      })
    ).toContain('solo se admiten')

    expect(
      validateAssetCodes({
        assetCodes: [],
        stockTotal: 12,
        trackIndividual: false,
      })
    ).toBeNull()
  })
})
