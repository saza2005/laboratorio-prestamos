# FASE 6.3B-L1-F3G

## Scope

F3AI remains forensic-only. It preserved the open validation status and did

F3AJ did not change the open acceptance status or authorize remote validation.
not authorize a remote execution, production fix, or freeze replacement.

F3G implemented the passive transport classification bridge locally. It does not replace `fetch`, mutate requests/responses/errors, inspect headers/body/URL, or alter business semantics. The bridge permits only the existing four approved transient classes and at most one recovery per exact read.

## Local result

Local tests passed for DNS recovery, repeated DNS failure, unknown transport fail-closed behavior, HTTP 4xx no-retry behavior, structured errors without raw evidence, observer ambiguity, semantic perturbation, fresh query creation, quantity controls, verifier, coordinator, cleanup, and R1-R4 read-only regressions.

## Targeted remote result

The one authorized passive-observer complete L1 PRE execution observed `L1_PRE_REQUESTS` failing with DNS resolution on attempt 1. The bridge allowed exactly one recovery. Attempt 2 also failed with DNS resolution. The read terminated FAIL after two attempts; `L1_PRE_LOANS` was not reached.

The final complete preflight was correctly not executed because the targeted verifier failed. No browser, fixture, mutation, business RPC, cleanup, or remote write occurred.

## F3X single-process result

The one authorized F3X coordinator run matched the F3W freeze and stopped
after one failed baseline core. Clean-state and L1 PRE were not executed;
there was no post-failure remote verification. The baseline core did not
emit a safe detailed classification, so the failure is recorded as
`BASELINE_CORE_FAILURE_UNCLASSIFIED`. Reliability remains OPEN.

F3Y confirmed that this F3X baseline failure cannot be attributed to L1 PRE.
The underlying read, transport class, and semantic result remain unknown;
no remote rerun was authorized.

## Status

```text
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_INITIAL_DELIVERY_CLICK
FLOW_L1_OFFICIAL_STATUS=OPEN
BASELINE_RESTORED=yes
STATE=CLEAN
```

## F3AD result

F3AD was local-only. It reproduced and fixed the stale CLI alias
projection that hid F3AB exception fields. Runtime/query/retry semantics
remain unchanged; the new freeze is `POST_F3AD_FORMATTER_PROJECTION_VALIDATED`.

## F3AC result

The one authorized F3AC single-process READ_ONLY preflight passed its
local gates and freeze, then failed in baseline. Clean-state and L1 PRE
were not reached; no post-failure check, retry, browser, or mutation ran.
The formatter did not expose the F3AB exception envelope because it used
legacy property aliases. Reliability validation therefore remains OPEN,
and no DNS conclusion is drawn.

F3AA did not reach L1 PRE. Its baseline core failed and downstream stages
were `NOT_REACHED`; no new DNS classification is valid from this phase.

F3Z was local-only. Baseline observability and coordinator propagation were
validated without changing retry policy. The F3W freeze is stale and the
F3Z freeze is now canonical; final reliability remains OPEN.

## F3T exact-launcher result

The exact-launcher dynamic differential was run without PRE or table reads.
Both DNS lookups and both HEAD probes passed; passive observation identified
the E2E origin correctly. Final pre-reliability validation remains OPEN.

## FASE 6.3B-L1-F3-FINAL-PREFLIGHT result

The single hardened preflight executed baseline, storageState integrity, and
clean-state successfully. The final L1 PRE then failed on `requests`: attempt
1 was `DNS_RESOLUTION_ERROR`, one `1000 ms` DNS backoff was applied, and
attempt 2 was again `DNS_RESOLUTION_ERROR`. Both passive host comparisons were
`MATCH` for the E2E target. `loans` was `NOT_REACHED`.

```text
PREFLIGHT_BASELINE=PASS
PREFLIGHT_STORAGE_STATE=PASS
STORAGE_STATE_HASHES=MATCH
PREFLIGHT_CLEAN_STATE=PASS
RESIDUAL_MUTATING=0
PREFLIGHT_L1_PRE=FAIL
FINAL_HARDENED_PREFLIGHT_RESULT=FAIL
L1_FINAL_DNS_FAILURE_AFTER_BACKOFF=yes
L1_FINAL_PRE_RELIABILITY_TARGETED_STAGE=FAIL
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
STATE=CLEAN
```

No second preflight, PRE, browser, fixture, or mutation was authorized or
executed.

Control note: a post-failure clean-state safety check was run to confirm the
workspace remained clean. This made `CLEAN_STATE_VERIFIER_EXECUTIONS=2`,
exceeding the phase limit of one; it is recorded as a protocol deviation and
does not change the failed result.

## F3U network-path and budget audit

F3U was local-only. It reconstructed baseline `3` and clean-state `2` actual
verifier executions because clean-state invokes baseline internally. F3T's
direct global fetch and L1's expected `supabase-js fetchWithAuth` wrapper both
terminate in the same global fetch path; no alternate dispatcher or agent was
found. The protocol deviation remains preserved.

## F3V feasibility result

The proposed single-process preflight is feasible only after minimal
extraction of reusable baseline, clean-state, and L1 PRE cores from their
CLI-only shells. F3V did not perform that refactor and did not alter the
current freeze.

## F3W implementation result

F3W completed local core extraction and coordinator validation. The historical
final PRE failure and nested-verifier budget deviation remain unchanged. No
remote preflight was run after the refactor.

## F3M-R3 result

`POST_F3N_COMPARATOR_VALIDATED` matched. The one complete PRE used the corrected passive observer. `L1_PRE_REQUESTS` had two `DNS_RESOLUTION_ERROR` attempts, one permitted recovery, and host class `MATCH` on both attempts. PostgREST normalized both transport failures into structured result errors with nullish data and no HTTP response. `L1_PRE_LOANS` was not reached.

```text
L1_F3M_R3_COMPLETE_L1_PRE=FAIL
L1_F3M_R3_REQUESTS_ATTEMPT_COUNT=2
L1_F3M_R3_REQUESTS_ATTEMPT1_HOST_CLASS=E2E_SUPABASE_HOST
L1_F3M_R3_REQUESTS_ATTEMPT2_HOST_CLASS=E2E_SUPABASE_HOST
L1_F3M_R3_UNEXPECTED_HOST_MISMATCH=no
L1_FINAL_PRE_RELIABILITY_TARGETED_STAGE=FAIL
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
```

The failure is now classified as persistent DNS failure on the actual E2E target during this observation window. No final preflight ran.

## F3R result

F3R matched the F3O freeze and reproduced the F3P pattern. `requests` failed on both allowed attempts with `DNS_RESOLUTION_ERROR`; the one-second backoff executed once, both passive host classes were `E2E_SUPABASE_HOST`, and `loans` was not reached. Final reliability remains OPEN and no preflight ran.

```text
L1_F3R_COMPLETE_L1_PRE=FAIL
L1_F3R_DNS_FAILURE_AFTER_BACKOFF=yes
L1_F3R_NEXT_DIAGNOSTIC_CLASS=VERIFIER_EXECUTION_CONTEXT_DIFFERENTIAL
```

## F3S execution-context result

F3S was local-only and found no network-, security-, or runtime-network-relevant difference between the F3R verifier launch context and F3Q diagnostics. The F3O freeze remains valid. Further work requires a separately authorized exact-launcher network diagnostic without Supabase table reads.

Historical F3A-F3F results remain unchanged.

## F3H dependency

F3H did not run L1 PRE. The E2E target configuration was structurally valid and no proxy was present, but the DNS diagnostic process failed while collecting network-namespace metadata before emitting its lookup classifications. Final reliability remains OPEN.

F3H-R2 corrected the reporting failure. Current control and E2E Node/NSS lookups and E2E IPv4 resolution pass; IPv6 has no data and is non-blocking. The historical F3G DNS failure is therefore classified as intermittent rather than currently reproducible. Final L1 PRE reliability remains OPEN pending its separately authorized validation.

## F3I result

The one authorized final targeted L1 PRE execution used the production client, production `readTable`, descriptors, and passive bridge without fetch replacement. `L1_PRE_REQUESTS` failed with DNS resolution on attempts 1 and 2. The single recovery was consumed; no third attempt occurred and `L1_PRE_LOANS` was not reached. Per the stop rule, no final preflight ran.

```text
L1_FINAL_PRE_RELIABILITY_TARGETED_STAGE=FAIL
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
```

## F3K result

The one authorized targeted L1 PRE used the production client and passive observer without fetch replacement. `L1_PRE_REQUESTS` failed with `DNS_RESOLUTION_ERROR` on attempts 1 and 2; one bounded recovery was recorded and no third attempt occurred. `L1_PRE_LOANS` was not reached. The final preflight was not run.

```text
L1_FINAL_PRE_RELIABILITY_TARGETED_STAGE=FAIL
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
```

F3J independently confirmed the current same-process path: lookup PASS, TLS PASS, and origin fetch RESOLVED with HTTP 4xx. This is transport success and does not validate L1 PRE. Final reliability remains OPEN pending explicit authorization for the next L1 PRE validation.

F3L's single canonical requests diagnostic passed on attempt 1. It did not execute loans, full L1 PRE, or preflight. Final reliability remains OPEN.

## F3M-FR1 freeze rebase

The post-F3L changes were reviewed locally. The diagnostic `maxAttempts=1` override is explicit and isolated; normal production reads remain at two attempts. Hostname comparison and passive observer changes are observational and retry-neutral. The new local freeze baseline is `POST_F3L_VALIDATED`. No remote operation occurred.

## F3M-R2 result

The validated freeze matched. The single complete L1 PRE failed with DNS on both requests attempts; loans was not reached. Passive Undici correlation reported hostname `MISMATCH` against the expected E2E target. The final preflight was not run.

## F3N unexpected network target provenance

F3N was local-only and preserved the F3M-R2 `MISMATCH` unchanged. The production client URL and expected E2E host both come from the effective `NEXT_PUBLIC_SUPABASE_URL`; a no-network PostgREST capture proved that the canonical `requests` builder retains the same host. The PRE stage has one Supabase client and no concurrent auxiliary network operation.

The historical mismatch was traced to the production verifier's passive-observer construction omitting the target-host argument. That made the comparator compare the observed hostname against an empty target and allowed a false `MISMATCH`. The verifier now passes the parsed effective target host. This local diagnostic correction invalidates the old `POST_F3L_VALIDATED` hash manifest; no new freeze was silently created and no remote read ran.

```text
L1_F3N_ROOT_CAUSE_CLASS=HOST_COMPARATOR_DEFECT
L1_F3N_ROOT_CAUSE_CONFIDENCE=HIGH
L1_F3N_FREEZE_INVALIDATED_BY_CHANGES=yes
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

## F3O DNS backoff resilience

F3O found no intentional delay between an approved transient attempt 1 and attempt 2. It added exactly one `1000 ms` DNS-only backoff before the existing second attempt. Attempt limits, retryable classes, fresh-query behavior, and verifier invariants remain unchanged. All local tests passed; no remote operation ran.

`POST_F3N_COMPARATOR_VALIDATED` is stale. The new local freeze is `POST_F3O_DNS_BACKOFF_VALIDATED` with a passing self-check.

## F3P result

The new freeze matched and exactly one complete PRE ran. `requests` failed with `DNS_RESOLUTION_ERROR` on attempt 1, executed one `1000 ms` DNS backoff, then failed again with `DNS_RESOLUTION_ERROR` on attempt 2. Both passive host classes were `E2E_SUPABASE_HOST`; `loans` was not reached. No third attempt or preflight ran.

```text
L1_F3P_COMPLETE_L1_PRE=FAIL
L1_F3P_REQUESTS_BACKOFF_EXECUTED=yes
L1_F3P_REQUESTS_BACKOFF_COUNT=1
L1_F3P_REQUESTS_BACKOFF_MS=1000
L1_F3P_DNS_FAILURE_AFTER_BACKOFF=yes
L1_FINAL_PRE_RELIABILITY_TARGETED_STAGE=FAIL
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
```

## F3Q resolver stability result

F3Q was local DNS diagnostics only. Node, NSS, and `resolve4` samples were fully healthy for both control and E2E targets. Historical DNS failures remain preserved as intermittent; no resolver configuration change or new L1 PRE was run.

## F3N-FR2 result

The comparator fix was validated locally. The verifier uses one effective URL value for both the production client and `passiveTargetHost`; no secondary target selection is available. Missing expected-target input is classified explicitly and cannot become a false authoritative mismatch. Production remains at two attempts per read with the unchanged four-class retry policy.

```text
L1_F3N_FREEZE_REBASE_STATUS=CLOSED
L1_POST_F3L_VALIDATED_FREEZE_STATUS=STALE
L1_F3N_NEW_FREEZE_BASELINE=POST_F3N_COMPARATOR_VALIDATED
L1_F3N_NEW_FREEZE_SELF_CHECK=PASS
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```
