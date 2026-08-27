export function parseAssetCodes(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return []

  return value
    .split(/\r?\n/)
    .map((code) => code.trim())
    .filter(Boolean)
}

export function validateAssetCodes({
  assetCodes,
  stockTotal,
  trackIndividual,
}: {
  assetCodes: string[]
  stockTotal: number
  trackIndividual: boolean
}): string | null {
  if (!trackIndividual && assetCodes.length > 0) {
    return 'Los códigos patrimoniales solo se admiten con seguimiento individual.'
  }

  if (!trackIndividual) return null

  if (assetCodes.length !== stockTotal) {
    return `Debe ingresar exactamente ${stockTotal} código${stockTotal === 1 ? '' : 's'} patrimonial${stockTotal === 1 ? '' : 'es'}, uno por unidad.`
  }

  const normalized = assetCodes.map((code) => code.toLocaleLowerCase('es'))
  if (new Set(normalized).size !== normalized.length) {
    return 'Los códigos patrimoniales no pueden repetirse.'
  }

  return null
}
