# FASE 6.3B-L1-F3O

## Scope

F3O was local-only. No remote read, DNS query, HTTP/TLS operation, browser run, fixture, mutation, business RPC, or preflight ran.

## Timing audit and change

The previous `readWithBoundedRetry` path had no intentional delay between an approved transient failure and attempt 2. F3O added one bounded `node:timers/promises` delay of `1000 ms`, only when attempt 1 is classified as `DNS_RESOLUTION_ERROR` and a second attempt is permitted.

The delay is injected in local tests, but the production default remains the real one-second timer. There is no delay before attempt 1, after attempt 2, for unknown errors, HTTP errors, connection reset, or timeout classes. The retryable set, maximum attempts, fresh-query contract, and whole-verifier retry prohibition are unchanged.

## Local validation

Synthetic tests passed for DNS recovery, repeated DNS failure, first-attempt success, unknown no-delay, HTTP 4xx no-delay, connection reset, connect timeout, read timeout, fresh query ordering, host comparator, passive bridge, quantity control, verifier, coordinator, F1/F2, R1-R4, TypeScript, Node checks, and directed ESLint. Global ESLint remains pre-existing and unchanged.

```text
L1_CURRENT_RETRY_DELAY_PRESENT=no
L1_DNS_RETRY_BACKOFF_IMPLEMENTED=yes
L1_DNS_RETRY_BACKOFF_MS=1000
L1_DNS_BACKOFF_CLASS_SET=DNS_RESOLUTION_ERROR_ONLY
L1_RETRYABLE_CLASS_SET_CHANGED=no
L1_READ_THIRD_ATTEMPT_REACHABILITY=0
L1_WHOLE_VERIFIER_RETRY_REACHABILITY=0
L1_DNS_BACKOFF_NETWORK_SIDE_EFFECT_REACHABILITY=0
L1_DNS_BACKOFF_BUSY_WAIT_REACHABILITY=0
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

## Freeze

Because retry timing changed, `POST_F3N_COMPARATOR_VALIDATED` is stale and remains untouched. The new sanitized five-file manifest is `POST_F3O_DNS_BACKOFF_VALIDATED`; its hash self-check and secret scan passed.

```text
L1_F3O_DNS_BACKOFF_STATUS=CLOSED
L1_POST_F3N_COMPARATOR_VALIDATED_FREEZE_STATUS=STALE
L1_F3O_NEW_FREEZE_BASELINE=POST_F3O_DNS_BACKOFF_VALIDATED
L1_F3O_NEW_FREEZE_SELF_CHECK=PASS
```

The next step requires explicit authorization for exactly one complete READ_ONLY L1 PRE against the new freeze.

## F3P result

The `POST_F3O_DNS_BACKOFF_VALIDATED` freeze matched. The one authorized complete PRE observed `requests` attempt 1 as `DNS_RESOLUTION_ERROR` on the E2E host, executed exactly one `1000 ms` DNS-only backoff, then created attempt 2 with a fresh query. Attempt 2 also failed with `DNS_RESOLUTION_ERROR` on the E2E host. No attempt 3 occurred and `loans` was not reached.

The bounded backoff is therefore proven to execute correctly but was insufficient during this DNS failure window. No larger delay, extra retry, DNS probe, or preflight was run.

## F3R result

F3R reproduced the same controlled failure: `requests` attempt 1 `DNS_RESOLUTION_ERROR`, one `1000 ms` DNS-only backoff, and attempt 2 `DNS_RESOLUTION_ERROR`. Both host classes were `E2E_SUPABASE_HOST`; no third attempt or phase retry occurred. The next diagnostic class is `VERIFIER_EXECUTION_CONTEXT_DIFFERENTIAL` because F3Q's bounded resolver sample was healthy.

F3S investigated that differential locally and found no material verifier context difference. The F3O freeze remains valid; no runtime retry or DNS code changed.

```text
L1_F3P_COMPLETE_L1_PRE=FAIL
L1_F3P_REQUESTS_ATTEMPT_COUNT=2
L1_F3P_REQUESTS_BACKOFF_EXECUTED=yes
L1_F3P_REQUESTS_BACKOFF_COUNT=1
L1_F3P_REQUESTS_BACKOFF_MS=1000
L1_F3P_REQUESTS_ATTEMPT1_HOST_CLASS=E2E_SUPABASE_HOST
L1_F3P_REQUESTS_ATTEMPT2_HOST_CLASS=E2E_SUPABASE_HOST
L1_F3P_DNS_FAILURE_AFTER_BACKOFF=yes
L1_F3P_LOANS_FINAL_RESULT=NOT_REACHED
```

## F3Q resolver stability result

F3Q did not modify the harness or run L1 PRE. The current Ubuntu resolver topology uses an active `systemd-resolved` stub with NetworkManager active. Five Node rounds and three NSS rounds passed for both the control and E2E host; two `resolve4` calls also passed. No current resolver failure was reproduced, and no remediation was performed.

## F3T exact-launcher result

F3T used the current validated backoff freeze only as a read-only reference;
it did not invoke the backoff or L1 PRE. One control DNS lookup, one E2E DNS
lookup, and one HEAD per origin all completed with transport success. No
retry, backoff, or table operation occurred.

## Final hardened preflight result

The approved DNS-only backoff executed exactly once during the final L1 PRE.
Requests failed with DNS on both attempts, so no third attempt or larger
backoff was used. The backoff contract remains unchanged and the final
reliability status remains OPEN.
