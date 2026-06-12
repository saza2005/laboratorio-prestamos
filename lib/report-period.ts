const MIN_REPORT_YEAR = 2020
const MAX_REPORT_YEAR = 2100

export type ReportPeriod = {
  month: number
  year: number
  startDate: string
  endDate: string
  startTimestamp: string
  endTimestamp: string
}

export function parseReportPeriod(
  monthValue: string | null | undefined,
  yearValue: string | null | undefined,
  fallbackDate?: Date
): ReportPeriod | null {
  const fallback = fallbackDate ?? null
  const month = Number(
    monthValue || (fallback ? fallback.getMonth() + 1 : Number.NaN)
  )
  const year = Number(
    yearValue || (fallback ? fallback.getFullYear() : Number.NaN)
  )

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < MIN_REPORT_YEAR ||
    year > MAX_REPORT_YEAR
  ) {
    return null
  }

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))

  return {
    month,
    year,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    startTimestamp: `${start.toISOString().slice(0, 10)}T00:00:00-05:00`,
    endTimestamp: `${end.toISOString().slice(0, 10)}T00:00:00-05:00`,
  }
}
