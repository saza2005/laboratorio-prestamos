const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Guayaquil',
})

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-EC', {
  month: 'long',
  timeZone: 'UTC',
})

export function formatDateTime(value: string | number | Date | null | undefined) {
  if (!value) return '-'

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return DATE_TIME_FORMATTER.format(date)
}

export function formatMonthName(monthIndex: number) {
  return MONTH_FORMATTER.format(new Date(Date.UTC(2024, monthIndex, 1)))
}
