import { describeSupabaseResult, readWithBoundedRetry } from './clean-state-diagnostics.mjs'

export const L1_PRE_REQUESTS_QUERY = Object.freeze({ table: 'requests', columns: 'purpose,comments', readClass: 'L1_PRE_REQUESTS' })
export const L1_PRE_LOANS_QUERY = Object.freeze({ table: 'loans', columns: 'notes', readClass: 'L1_PRE_LOANS' })

export async function readTable(client, query, onEvent = () => {}, { transportObserver = null, maxAttempts = 2 } = {}) {
  let currentAttempt = 0
  return readWithBoundedRetry(
    async () => {
      const response = await client.from(query.table).select(query.columns)
      const boundary = describeSupabaseResult(response)
      onEvent({ result: 'RESULT_BOUNDARY', table_class: query.table, readClass: query.readClass, ...boundary })
      if (response.error) {
        const wrapped = new Error('supabase_result_error')
        const evidence = transportObserver?.getAttemptEvidence?.(query.ordinal ?? 1, currentAttempt) ?? { status: 'NONE', events: [] }
        if (evidence.status === 'ONE') {
          const rawClass = evidence.events[0]?.fingerprint?.transportClass ?? evidence.events[0]?.fingerprint?.errorClass
          if (['DNS_RESOLUTION_ERROR', 'CONNECTION_RESET', 'CONNECT_TIMEOUT', 'READ_TIMEOUT'].includes(rawClass)) {
            wrapped.l1DiagnosticClass = rawClass
            wrapped.transportEvidence = rawClass
          } else {
            wrapped.l1DiagnosticClass = boundary.errorClass
          }
        } else {
          wrapped.l1DiagnosticClass = boundary.errorClass
        }
        throw wrapped
      }
      return response.data ?? []
    },
    {
      ordinal: query.ordinal ?? 1,
      readClass: query.readClass,
      onAttemptStart: (attempt) => {
        currentAttempt = attempt
        transportObserver?.setAttempt?.(attempt)
      },
    },
    onEvent,
    { maxAttempts },
  )
}
