# FLOW-R3 REAL-1B-PF - Clean-state preflight read failure forensic

## Preserved failure

No separate stdout/stderr, stack, or verifier log was persisted. The available failure evidence is the terminal sanitized class `clean_state_read_failed`. The failure occurred before Playwright and before any R3 seed, approval, cleanup, RPC, or remote write.

## Verifier contract

`verify-mutating-clean-state.mjs`:

1. reads local mutating state;
2. invokes `verify-baseline.mjs` as a child process;
3. calls `findMutatingNamespace()`.

`findMutatingNamespace()` uses the E2E Supabase endpoint and service-role read client to scan seven tables for allowlisted E2E namespace markers. The expected remote read count is therefore the baseline verifier's read set plus seven namespace scans. It performs no writes.

Baseline and clean-state share the endpoint class, Supabase client class, and read credential class. StorageState validation is local-only: JSON shape, permissions, ignore status, hashes/content checks, and cookie-domain checks.

## Classification

The prior clean-state failure is classified `TRANSIENT_NETWORK_FAILURE` with medium confidence. The verifier's broad catch intentionally sanitizes the underlying nested read error to `clean_state_read_failed`; this is insufficient to prove DNS, TCP, TLS, or a query defect from the preserved artifact alone. The later successful single revalidation, with unchanged verifier contract, supports a transient remote read failure and does not indicate a verifier logic defect.

`CLEAN_STATE_VERIFIER_CHANGED=no`

`CLEAN_STATE_CONTRACT_RELAXED=no`

## Validation

- Local TypeScript, Node, directed ESLint, clean-state/state/tracking, locator, classifier, replay, completion, handshake, lifecycle, and ACTION_DONE tests: PASS.
- Exactly one remote READ_ONLY revalidation: baseline PASS, storageState PASS, clean-state PASS, hashes MATCH, residual mutating `0`, state CLEAN.
- Locator hotfix intact: initial handle captured before click, dialog-scoped confirm, no positional selectors.
- Browser runs `0`; seed/approval/cleanup/RPC/writes `0`; retry `no`.

## Status

`R3_REMOTE_PREFLIGHT_RECOVERY_STATUS=CLOSED`

`R3_REAL1_LOCATOR_FORENSIC_STATUS=CLOSED`

`R3_REAL1_LOCATOR_RUNTIME_VALIDATION_STATUS=BLOCKED_BY_PREFLIGHT`

`FLOW_R3_REAL_ATTEMPT_1_STATUS=FAIL_BEFORE_APPROVAL`

`FLOW_R3_OFFICIAL_STATUS=OPEN`

Next safe step: obtain separate explicit authorization for a fresh REAL-1B corrected-locator runtime validation. No REAL-1B runtime is executed in this phase.
