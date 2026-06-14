export function getEcuadorDate(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day}`
}

export function getEffectiveLoanStatus(
  status: string,
  expectedReturnDate: string | null | undefined,
  currentDate = getEcuadorDate()
) {
  if (
    (status === 'active' || status === 'partial_return') &&
    expectedReturnDate &&
    expectedReturnDate < currentDate
  ) {
    return 'overdue'
  }

  return status
}
