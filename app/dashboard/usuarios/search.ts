export function normalizeUserSearch(value?: string) {
  return (value ?? '')
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}@._+\-\s]/gu, '')
}
