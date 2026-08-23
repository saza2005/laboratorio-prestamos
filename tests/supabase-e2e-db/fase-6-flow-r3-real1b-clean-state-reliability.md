# FLOW-R3 REAL-1B-PF2 - Clean-state read reliability

## Call graph

The full preflight has one top-level baseline invocation, one storageState local validation, and one clean-state invocation. Clean-state independently invokes baseline once, then scans the seven namespace targets:

1. `NAMESPACE_SCAN_REQUESTS`
2. `NAMESPACE_SCAN_REQUEST_GROUPS`
3. `NAMESPACE_SCAN_LOANS`
4. `NAMESPACE_SCAN_RETURNS`
5. `NAMESPACE_SCAN_MAINTENANCE_RECORDS`
6. `NAMESPACE_SCAN_ITEMS`
7. `NAMESPACE_SCAN_INVENTORY_MOVEMENTS`

The baseline verifier contains 18 remote read operations, including three staging reads. Therefore a full preflight has two baseline verifier invocations, and one standalone clean-state run has the nested baseline read set plus seven namespace scans. The duplicated baseline read is unnecessary duplication but is retained because clean-state remains safe as a standalone verifier.

## Sanitized observability

`verify-mutating-clean-state.mjs` and the READ_ONLY remote helper now preserve only local metadata in `.e2e-state/runtime/clean-state-diagnostics.json`: read ordinal/class, attempt, duration class, success/failure, error layer/class, and HTTP status class. Endpoint, headers, body, rows, IDs, and credentials are excluded.

The public failure remains `clean_state_read_failed`, but captured failures now include the safe failed-read ordinal/class/layer metadata. Unknown errors remain `UNKNOWN_REMOTE_READ_ERROR` and fail closed.

## Error policy

Transient allowlist:

- `DNS_RESOLUTION_ERROR`
- `CONNECTION_RESET`
- `CONNECT_TIMEOUT`
- `READ_TIMEOUT`

At most one retry is allowed for the same READ_ONLY target. Both attempts remain observable. HTTP 4xx/5xx, auth, PostgREST, query, parse, and unknown errors receive no retry. No mutating operation is retried.

## Validation

- DNS, reset, timeout, HTTP 5xx, auth, query, parse, unknown, success, transient recovery, transient double-failure, and non-transient no-retry tests: PASS.
- TypeScript, Node, directed ESLint, state/tracking, locator, classifier, replay, completion, handshake, lifecycle, and ACTION_DONE tests: PASS.
- One controlled remote clean-state validation: PASS. Seven namespace reads, all first-attempt success; recovery count `0`.
- Follow-up storageState validation: PASS; hashes MATCH.
- Residual mutating: `0`; state CLEAN.

## Invariants

Target set unchanged. Success criteria unchanged. Residual criteria unchanged. Locator hotfix, classifier, completion, ACTION_DONE, seed, cleanup, and business code unchanged.

`R3_CLEAN_STATE_RELIABILITY_STATUS=CLOSED`

`R3_REMOTE_PREFLIGHT_RECOVERY_STATUS=CLOSED`

`R3_REAL1_LOCATOR_RUNTIME_VALIDATION_STATUS=BLOCKED_BY_PREFLIGHT`

`FLOW_R3_REAL_ATTEMPT_1_STATUS=FAIL_BEFORE_APPROVAL`

`FLOW_R3_OFFICIAL_STATUS=OPEN`

Next safe step: obtain explicit authorization for a new REAL-1B corrected-locator runtime using this hardened READ_ONLY preflight. No REAL-1B runtime is executed here.

## RUNTIME-2 preflight reuse

The fresh hardened preflight immediately preceding REAL-1B-RUNTIME-2 passed baseline, storageState, and clean-state. The seven namespace diagnostics were all `SUCCESS` on attempt `1`; transient failure count `0`, recovery count `0`, non-transient failure count `0`, and unknown failure count `0`. Residual mutating was `0` and state was CLEAN. No reliability code or retry policy changed during runtime.
