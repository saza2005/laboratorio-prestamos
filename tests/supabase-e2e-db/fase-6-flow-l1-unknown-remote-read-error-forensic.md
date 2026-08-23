# FLOW-L1 F3B - Unknown remote read error forensic

## F3F classification update

Historical F3A/F3B unknown classifications remain preserved. F3F independently captured a DNS-resolution transport rejection in the complete verifier, followed by installed `postgrest-js` normalization. It does not retroactively reclassify the earlier unknown failures.

## F3E result

PostgREST-js can normalize rejected fetches to structured results with status zero. The remote tap observation succeeded, but the failing complete path was not tapped; native origin remains unresolved.

## F3D result

The canonicalized read implementation reproduced `SUPABASE_RESULT_ERROR_OBJECT`; the semantic code and message remain unresolved and were not exposed.

## F3C refinement

The complete path received a fulfilled Supabase response with `data=null` and a structured result error (`code`, `details`, `hint`, `message`). It is explicitly classified as `SUPABASE_RESULT_ERROR_OBJECT`, remains fail-closed/nonretryable, and does not alter the historical F3A `UNKNOWN` classification.

## Result

The historical F3A classification remains `UNKNOWN` and was not rewritten as transient. The current read path is:

```text
L1 PRE -> readTable -> readWithBoundedRetry -> Supabase/PostgREST read -> result/error
```

The query set is unchanged: `requests(purpose,comments)` and `loans(notes)`. The wrapper now uses the existing one-recovery-per-read policy and emits sanitized diagnostics.

## Local audit

The classifier now covers top-level errors, nested causes, and aggregate errors. Synthetic tests pass for top-level and caused DNS/reset/connect-timeout/read-timeout shapes, unknown errors, non-transient no-retry behavior, and secret redaction. Retryable classes remain exactly:

```text
DNS_RESOLUTION_ERROR
CONNECTION_RESET
CONNECT_TIMEOUT
READ_TIMEOUT
```

No timeout controller or AbortSignal is used by the current L1 read wrapper; no stale signal or Promise.race defect was found.

## Remote sequence

The narrow `requests` probe passed once. The narrow `loans` probe passed once. The one complete L1 PRE verifier then failed on `L1_PRE_REQUESTS`. Its fingerprint contained only:

```text
constructorClass=Object
name=NONE
codeClass=PRESENT_UNSAFE_OR_ABSENT
causeChainDepth=0
aggregateNestedErrorCount=0
timeoutOrAbortClass=NONE
```

No URL, host, token, authorization, body, or opaque header was captured. The empty object proves a diagnostic-information loss at or before the verifier catch boundary, but it does not identify the native remote/network cause.

## Closure state

```text
L1_UNKNOWN_REMOTE_READ_ROOT_CAUSE=INSUFFICIENT_HISTORICAL_EVIDENCE
L1_UNKNOWN_REMOTE_READ_ROOT_CAUSE_CONFIDENCE=HIGH
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
FLOW_L1_OFFICIAL_STATUS=OPEN
BASELINE_RESTORED=yes
STATE=CLEAN
```

No complete preflight, browser, fixture, cleanup, business RPC, or remote write was performed after the failed complete verifier.
