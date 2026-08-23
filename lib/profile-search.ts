import { normalizeSearchText } from '@/lib/item-format'

type SearchableProfile = {
  id: string
  full_name: string | null
  email?: string | null
}

export function filterProfilesForSelection<T extends SearchableProfile>(
  profiles: T[],
  search: string,
  selectedId = ''
) {
  const term = normalizeSearchText(search)
  if (!term) return profiles

  const matches = profiles.filter(
    (profile) =>
      normalizeSearchText(profile.full_name).includes(term) ||
      normalizeSearchText(profile.email).includes(term)
  )

  if (!selectedId || matches.some((profile) => profile.id === selectedId)) {
    return matches
  }

  const selected = profiles.find((profile) => profile.id === selectedId)
  return selected ? [selected, ...matches] : matches
}
