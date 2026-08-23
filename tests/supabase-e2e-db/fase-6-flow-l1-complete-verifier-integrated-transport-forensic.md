# FASE 6.3B-L1-F3F

## Scope

This phase used local-first validation and one remote read-only execution. No browser, fixture, business RPC, delivery, loan, cleanup, migration, staging, or commit was performed.

Historical F3A-F3E outcomes remain unchanged. In particular, F3E's tapped narrow request PASS and untapped complete verifier failure are preserved.

## Local Validation

The complete verifier now accepts the transparent diagnostic fetch tap through the normal production client factory. It reuses the production `readTable` and the production requests/loans descriptors. The tap returns the original `Response` and rethrows the original error without inspecting URL, headers, or body.

Local tests passed for two-read success, normalized fetch rejection, approved transient retry policy, unknown rejection fail-closed behavior, HTTP 4xx handling, installed postgrest normalization, tap identity, secret redaction, and passive `diagnostics_channel` observation. The passive observer was proven available locally but was not run remotely because the tap execution failed.

## Single Remote Observation

The complete verifier with tap failed on `L1_PRE_REQUESTS`; `L1_PRE_LOANS` was not executed. The tap observed a rejected fetch with sanitized DNS resolution fingerprint: `ENOTFOUND` and `GETADDRINFO`. The PostgREST boundary was fulfilled with null data, a structured error, and no HTTP response status, matching installed `postgrest-js` normalization of fetch rejection.

This is classified as `TRANSPORT_REJECTION_OBSERVED_IN_COMPLETE`, specifically a DNS-resolution failure. It is not a server semantic error. No retry was performed because the current read path receives the library-normalized result rather than the original thrown transport error; retry policy was not broadened.

## Status

`L1_COMPLETE_TRANSPORT_FORENSIC_STATUS=CLOSED`

`L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN`

`L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN`

`L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_INITIAL_DELIVERY_CLICK`

`REMOTE_BROWSER_RUNS=0`, `REMOTE_WRITES=0`, `STATE=CLEAN`.
