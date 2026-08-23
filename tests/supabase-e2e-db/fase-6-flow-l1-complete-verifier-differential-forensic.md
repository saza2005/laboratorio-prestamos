# FLOW-L1 F3C - Narrow versus complete verifier differential

## F3E result

The installed library can normalize fetch rejection. The canonical tap observation returned HTTP 2xx and array data, while the complete verifier without the tap failed. The exact fetch boundary of the failing complete attempt remains unresolved.

## F3D result

The canonical requests probe now reuses production `readTable` and the production query constants. It reproduced `SUPABASE_RESULT_ERROR_OBJECT` in one attempt. Loans, complete verifier, and final preflight were intentionally skipped by the stop rule.

## Entrypoints

```text
requests narrow: scripts/e2e/probe-l1-pre-read.mjs --read=requests
loans narrow: scripts/e2e/probe-l1-pre-read.mjs --read=loans
complete: scripts/e2e/verify-mutating-flow-l1.mjs --stage=pre
```

The narrow probes call the Supabase client directly through `readWithBoundedRetry`. The complete verifier calls `readTable`, which uses the same client factory and retry helper, but adds result-boundary inspection and fail-closed sequencing.

The logical queries match: `requests` selects `purpose,comments`; `loans` selects `notes`; there are no filters, order, limit, or single-row modifiers. Each command is a separate Node process using `.env.e2e`. The complete verifier creates one client and performs sequential reads, requests first and loans only after requests passes.

## Boundary evidence

The single complete diagnostic execution produced this sanitized boundary for `L1_PRE_REQUESTS`:

```text
promiseResolutionClass=FULFILLED
dataPresent=no
dataClass=NULLISH
dataRowCountClass=NOT_ARRAY
errorEnumerableKeyNames=code,details,hint,message
errorOwnPropertyNames=code,details,hint,message
errorSymbolCount=0
errorStatusClass=NONE
```

The result was not `{ data: ..., error: {} }`. It was a Supabase result error object with structural fields. The complete path failed before `L1_PRE_LOANS`; this was not a thrown transport error, timeout, AbortSignal issue, query-builder reuse, or global counter contamination.

The explicit local class is `SUPABASE_RESULT_ERROR_OBJECT`. It is fail-closed and never retryable. The empty-object synthetic class remains available for the separate `{}` case.

## Validation and status

Local classifier, cause-chain, AggregateError, safe-fingerprint, boundary, two-read sequencing, counter-isolation, fingerprint-isolation, quantity, F1, F2, TypeScript, Node, and directed ESLint tests pass. Retryable classes remain unchanged.

The narrow requests and loans probes each passed once. The complete diagnostic failed once on requests with the structured Supabase result error. Per the stop rule, no second diagnostic and no complete preflight were executed.

```text
L1_NARROW_COMPLETE_DIFFERENTIAL_ROOT_CAUSE=SUPABASE_RESULT_ERROR_OBJECT
L1_NARROW_COMPLETE_DIFFERENTIAL_CONFIDENCE=HIGH
L1_PRE_QUERY_SET_CHANGED=no
L1_PRE_VERIFIER_SUCCESS_CRITERIA_RELAXED=no
L1_PRE_TARGET_SET_CHANGED=no
L1_RETRYABLE_CLASS_SET_CHANGED=no
L1_REMOTE_WRITE_REACHABILITY=0
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_INITIAL_DELIVERY_CLICK
FLOW_L1_OFFICIAL_STATUS=OPEN
BASELINE_RESTORED=yes
STATE=CLEAN
```
