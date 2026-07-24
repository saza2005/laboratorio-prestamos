export function normalizeSearchText(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase('es') ?? ''
}

export function formatAssetCodes(codes: string[]) {
  if (codes.length === 0) return null
  if (codes.length <= 2) return codes.join(', ')
  return `${codes.slice(0, 2).join(', ')} +${codes.length - 2}`
}
