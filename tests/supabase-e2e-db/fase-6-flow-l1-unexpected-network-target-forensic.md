# FASE 6.3B-L1-F3N

## Scope

F3N was local-only. It performed no Supabase read, DNS query, HTTP/TLS operation, browser run, fixture operation, mutation, or preflight. Its purpose was to audit the provenance of the effective Supabase target and the passive hostname comparator after the F3M-R2 historical `MISMATCH`.

## Provenance result

The production client factory reads `NEXT_PUBLIC_SUPABASE_URL` from `process.env`. The passive observer target used by the production PRE verifier is derived from that same effective URL with `URL.hostname`. The expected E2E target therefore has the same source and the same effective host/origin as the production client.

The canonical `requests` builder was exercised with a no-network fetch capture. Its constructed request host matched the production client host and the expected E2E host. The capture returned a synthetic HTTP 200 response and performed no network I/O.

The PRE verifier creates one Supabase client and its PRE stage has no concurrent auxiliary network operation. The passive read/attempt context is explicit; the observed F3M-R2 mismatch was not evidence of another destination.

## Comparator finding

The F3M-R2 run preserved `HOST_COMPARATOR_RESULT=MISMATCH`. The current source audit found that the production verifier previously called `startPassiveObserver(() => currentReadOrdinal)` without passing the target hostname. The comparator consequently compared the observed host against an empty target and could produce a false mismatch.

This is a diagnostic invocation defect, not proof that another network target was contacted. The verifier now passes `passiveTargetHost`, derived from the effective production URL. Case and trailing-dot normalization are not silently broadened by this change; the comparison remains hostname-only and fail-closed.

## Local validation

The following passed without remote I/O: request-host provenance capture, project identity fail-closed checks, environment precedence checks, comparator tests, secret-redaction checks, passive bridge tests, production two-attempt isolation, quantity-control tests, verifier tests, F1/F2 checks, TypeScript, and directed ESLint. The global ESLint baseline remains pre-existing and unchanged.

## Freeze consequence

Because `verify-mutating-flow-l1.mjs` changed to pass the target host explicitly, the prior `POST_F3L_VALIDATED` manifest is stale. It was not silently replaced.

```text
L1_F3N_ROOT_CAUSE_CLASS=HOST_COMPARATOR_DEFECT
L1_F3N_ROOT_CAUSE_CONFIDENCE=HIGH
L1_F3N_FREEZE_INVALIDATED_BY_CHANGES=yes
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
DNS_QUERY_EXECUTIONS=0
HTTP_EXECUTIONS=0
TLS_EXECUTIONS=0
STATE=CLEAN
```

The historical F3M-R2 result remains unchanged. A fresh local freeze rebase and a separately authorized remote F3M execution are required before further L1 PRE validation.

## F3N-FR2 comparator freeze rebase

F3N-FR2 validated the comparator correction locally. The effective production URL is read once by the verifier and passed explicitly to both the production client factory and the passive observer. A missing expected target now produces `EXPECTED_TARGET_MISSING`, not an authoritative `MISMATCH`.

The old invocation was reproduced synthetically: an observed host with an empty expected target yielded the historical false mismatch under the old comparator. The corrected invocation yielded `MATCH` for the same target. Retry classes, maximum attempts, query descriptors, client construction semantics, and verifier invariants remained unchanged.

The new sanitized freeze is `POST_F3N_COMPARATOR_VALIDATED`. It contains five runtime-critical file hashes and passed immediate self-check. The old `POST_F3L_VALIDATED` manifest remains stale and untouched.

## F3M-R3 result

The new freeze matched and the single authorized complete PRE executed. `requests` failed on attempts 1 and 2 with `DNS_RESOLUTION_ERROR`; both passive host classifications were `MATCH` against the effective E2E target. PostgREST returned a fulfilled structured result error with nullish data and no HTTP response. The bounded recovery was consumed, no third attempt occurred, and `loans` was not reached.

No preflight or other remote operation ran. The corrected comparator produced no unexpected host mismatch.
