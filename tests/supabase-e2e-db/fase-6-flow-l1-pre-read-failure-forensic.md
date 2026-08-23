# FLOW-L1 F3A - L1 PRE read failure forensic

## F3F transport-origin observation

F3F integrated a transparent fetch tap into the complete verifier. The single authorized remote execution observed the requests fetch rejecting with a sanitized DNS-resolution fingerprint. `postgrest-js` then normalized that rejection into the structured result seen by `readTable` (`data=null`, status class none). This explains the structured result without classifying it as a server semantic error. Historical F3A-F3D failures remain unchanged and the pre-read forensic remains open.

## F3G result

The passive bridge successfully correlated the raw DNS event to `L1_PRE_REQUESTS` attempt 1 and allowed one existing-policy recovery. Attempt 2 also failed with DNS resolution, so the read failed closed and `L1_PRE_LOANS` was not executed. The final preflight was not reached; this forensic remains OPEN.

## F3E result

The installed PostgREST normalization behavior was confirmed locally. The canonical tap observation succeeded with HTTP 2xx; the complete verifier without the tap failed again. No final preflight was run.

## F3D result

The canonical requests probe reused production `readTable` and reproduced the structured Supabase result error on attempt `1`. Semantic code/message values remain redacted and unresolved. No loans probe or preflight followed.

## F3C differential result

The complete verifier now records a result boundary before wrapping errors. The single diagnostic showed a fulfilled Supabase result with `data=null` and an error object whose safe own keys were `code`, `details`, `hint`, and `message`. Narrow requests and loans probes passed, but the complete verifier failed on requests before executing loans.

The discrepancy is classified as `SUPABASE_RESULT_ERROR_OBJECT`, not a transport failure. It remains nonretryable. No second diagnostic or complete preflight was run.

## Failure source

The original failure came from `scripts/e2e/verify-mutating-flow-l1.mjs`, where any error from the `requests` or `loans` read was collapsed into `l1_pre_read_failed`. The previous implementation performed both reads directly and provided no per-read diagnostics or bounded recovery.

The local implementation now reads sequentially through the existing `readWithBoundedRetry` helper. It records only ordinal, read class, table class, attempt, duration class, result, sanitized error layer/class, status class, and zero-write summary in `.e2e-state/runtime/l1-pre-read-diagnostics.json`.

## Read model

```text
L1_PRE_REMOTE_READ_COUNT=2
L1_PRE_REMOTE_READ_SEQUENCE=L1_PRE_REQUESTS -> L1_PRE_LOANS
L1_PRE_L1_SPECIFIC_READS=requests purpose/comments; loans notes
L1_PRE_REMOTE_WRITE_REACHABILITY=0
L1_PRE_BUSINESS_RPC_REACHABILITY=0
```

The verifier target set and business invariants were unchanged. A legitimate clean PRE state is represented by zero namespace matches, not zero rows in the whole tables; empty result sets are accepted.

## Probe result

The targeted remote probe failed on read ordinal `1`, class `L1_PRE_REQUESTS`, table class `requests`, in `UNDER_250MS`:

```text
errorLayer=REMOTE
errorClass=UNKNOWN_REMOTE_READ_ERROR
statusClass=NONE
attempt=1
retryAllowed=no
retryExecuted=no
```

Because the failure classified as `UNKNOWN`, the existing policy correctly performed no retry. A later direct diagnostic read of the same sanitized query returned four rows without error, demonstrating intermittent behavior or an unexposed transport/client error, but this does not justify broadening the approved transient allowlist.

The complete preflight was not run after the failed targeted probe, as required by the phase contract. No browser, fixture mutation, business RPC, cleanup, or remote write occurred.

## Reliability policy

The existing bounded policy is reusable and permits at most one recovery for:

```text
DNS_RESOLUTION_ERROR
CONNECTION_RESET
CONNECT_TIMEOUT
READ_TIMEOUT
```

It does not retry authentication, HTTP/PostgREST/query, parse/result-shape, or unknown errors. There is no whole-verifier retry. Synthetic transient and non-transient tests pass.

## Status

```text
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_INITIAL_DELIVERY_CLICK
FLOW_L1_OFFICIAL_STATUS=OPEN
BASELINE_RESTORED=yes
STATE=CLEAN
```

The next safe step is a separately authorized read-only investigation of the unclassified remote read error. Do not run a browser or mutating rehearsal until a targeted probe and complete read-only preflight both pass.

## F3B result

The local error wrapper audit completed. Classification now traverses top-level errors, nested `cause` chains, and `AggregateError.errors`; the safe fingerprint records only structural classes and redacts URL, host, authorization, token, and body content. The retry set remains unchanged.

The narrow `requests` probe passed in one attempt and the narrow `loans` probe passed in one attempt. The subsequent single complete L1 PRE verifier failed again on `L1_PRE_REQUESTS` with `UNKNOWN_REMOTE_READ_ERROR`. Its safe fingerprint was an empty plain object: no name, code, errno, syscall, cause, status, or aggregate members were present. This proves an error-information gap in the received wrapper but does not prove the native remote cause.

The complete preflight was not run. Historical F3A remains `UNKNOWN`; current root cause is `INSUFFICIENT_HISTORICAL_EVIDENCE` with a demonstrated diagnostic-information gap. No browser, fixture mutation, business RPC, cleanup, or remote write occurred.

```text
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
```

F3M-FR1 locally rebased the runtime freeze after F3L. The production retry default remains two attempts and the diagnostic one-attempt override is isolated. No remote read occurred.

F3N-FR2 completed the local rebase. The old manifest remains stale; the new `POST_F3N_COMPARATOR_VALIDATED` manifest contains five runtime-critical files and passed hash and secret self-checks. Final reliability remains OPEN pending a separately authorized remote F3M execution.

## F3O result

F3O added one bounded `1000 ms` delay only between approved DNS attempt 1 and attempt 2. The retry set, two-attempt limit, fresh query factory, and all non-DNS behavior remain unchanged. F3O was local-only and created the new `POST_F3O_DNS_BACKOFF_VALIDATED` freeze.

## F3P result

The single authorized PRE matched the F3O freeze and used the DNS backoff. `requests` failed on both allowed attempts with `DNS_RESOLUTION_ERROR`; the one-second backoff executed once, both host classifications were `E2E_SUPABASE_HOST`, and `loans` was not reached. The failure remains open because DNS was still unavailable after the bounded recovery.

## F3M-R3 result

The new freeze matched. The one complete PRE failed on `requests` after the approved two-attempt policy: both raw transport observations were `DNS_RESOLUTION_ERROR`, both host comparisons were `E2E_SUPABASE_HOST`, and both normalized PostgREST boundaries were structured result errors with nullish data. `loans` was not reached and no preflight ran. The historical F3M-R2 mismatch remains unchanged; F3M-R3 produced no unexpected-host mismatch.

## F3N result

F3N was local-only. It found that F3M-R2's preserved passive hostname `MISMATCH` was reproducible as a false comparator result because the production verifier omitted the effective target host when constructing the passive observer. Production URL provenance and canonical request-host provenance were otherwise consistent. The local verifier correction is diagnostic-only, but it makes the previous `POST_F3L_VALIDATED` manifest stale; no remote read was run and no freeze was silently replaced.

## F3Q result

F3Q did not reopen or reinterpret the F3P failure. It performed bounded local resolver samples only: Node 5/5 and NSS 3/3 for the E2E host, with `resolve4` 2/2. The historical failure remains an intermittent environmental DNS issue not reproduced in this sample.

## F3R result

F3R reproduced the failure on the real verifier path after the F3O backoff: two DNS attempts on the E2E host, one bounded recovery, and no third attempt. `loans` was not reached. This is now classified as `VERIFIER_EXECUTION_CONTEXT_DIFFERENTIAL` relative to the healthy F3Q sample.

## F3S result

F3S audited launcher, environment, Node, DNS defaults, fetch/Undici state, security labels, and import side effects without network I/O. No material context difference was found; the F3R/F3P DNS failure remains preserved.

## F3T exact-launcher result

F3T did not alter the pre-read failure classification. The bounded exact
launcher sample was healthy, with no retry and no Supabase table read. The
historical E2E-host DNS failures remain preserved as intermittent evidence.

## F3U result

The network-free PostgREST capture proved the canonical requests builder uses
the E2E target and the expected Supabase auth fetch wrapper. No alternate
network stack or observer mutation was found; the pre-read DNS failure remains
environmental/process-boundary evidence.

## Final hardened preflight result

The one authorized final preflight reproduced the same failure in the real
L1 PRE path after the approved DNS backoff. Requests attempt 1 and attempt 2
were both `DNS_RESOLUTION_ERROR`, each passive host comparison matched the
E2E target, and loans was not reached. Baseline, storageState, clean-state,
and residual checks passed. The forensic status remains `OPEN`.

## F3V feasibility result

F3V found no new L1 network defect. A future single-process coordinator may
retain one Node/Undici/DNS context, but this is not a DNS fix. Core extraction
and local validation must precede any new remote PRE.

F3X added no L1 PRE evidence because the coordinator stopped at its single
baseline core execution.

F3Y classified the F3X issue before L1 as a coordinator failure-detail loss
plus insufficient baseline transport observability. It does not reclassify
any historical L1 DNS result.

F3AA failed before L1 PRE, so it adds no new L1 read-failure evidence.

F3AB adds only local exception-path coverage; it does not alter any prior
L1 transport finding.

F3Z added no L1 PRE execution. It only improved baseline diagnostics and
classified downstream unexecuted stages as `NOT_REACHED`.

F3AC also did not reach L1 PRE. Its single baseline failure produced no
new DNS evidence because the coordinator CLI failed to render the F3AB
exception-envelope fields. The historical L1 read failures remain
unchanged.

F3AD corrected only the formatting projection. It does not add L1 PRE
evidence and does not reclassify any historical DNS result.

F3AE failed before any baseline read and therefore adds no L1 read or DNS
evidence. Its structured failure was a local observer-start exception.
