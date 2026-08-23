# F3BQ - stale single-process coordinator audit

Phase: `F3BQ`
Mode: `AUDIT_AND_DESIGN_ONLY`

## Root cause

The single stale surface is:

```text
scripts/e2e/verify-mutating-l1-single-process-preflight.mjs
```

Its `checkFreeze()` still reads
`.e2e-state/l1-f3ad-formatter-projection-manifest.json` and requires
`POST_F3AD_FORMATTER_PROJECTION_VALIDATED`. The active runtime reference is
`POST_F3BL_AMENDED_FREEZE`. This is a `STALE_FREEZE_REFERENCE`, not an API,
environment, call-graph, retry, or L1 PRE contract defect.

The coordinator imports the current `runBaselineCore`, `runCleanStateCore`,
and `runL1PreCore` exports with matching invocation shapes. Its order is
baseline, clean-state, then L1 PRE; it stops on the first failure, performs no
nested baseline, uses no child process, and performs no post-failure remote
check. The current F3AY/F3BB/F3BL changes are visible to the imported baseline
core.

## Minimum fix design

```text
MINIMUM_HARNESS_FIX=UPDATE checkFreeze() TO USE POST_F3BL_AMENDED_FREEZE REFERENCE
MINIMUM_HARNESS_FILE=scripts/e2e/verify-mutating-l1-single-process-preflight.mjs
MINIMUM_HARNESS_FILE_COUNT=1
MINIMUM_HARNESS_SYMBOL=freezeManifestPath/checkFreeze
FIX_LAYER=FORENSIC_HARNESS
```

The future change must consume an explicitly established post-F3BL freeze
manifest/reference and must not alter core semantics, env loading, retry
policy, query contract, network stack, child-process behavior, or stage gates.

## PRE-read contract and safety

```text
L1_PRE_SEQUENCE=L1_PRE_REQUESTS -> L1_PRE_LOANS
REQUESTS_MAX_ATTEMPTS=2
LOANS_MAX_ATTEMPTS=2
DNS_BACKOFF_MS=1000
RETRYABLE_CLASSES=DNS_RESOLUTION_ERROR,CONNECTION_RESET,CONNECT_TIMEOUT,READ_TIMEOUT
ATTEMPT3_REACHABLE=no
WHOLE_VERIFIER_RETRY_REACHABLE=no
REMOTE_WRITES=0
BUSINESS_RPC=0
CHILD_PROCESSES=0
```

Historical DNS failures remain preserved as intermittent environmental/process
context DNS. A future PASS can validate the current production-equivalent
READ_ONLY path but cannot erase that history. No new targeted requests probe
is required before the single-process preflight.

## Readiness

```text
POST_AUDIT_READINESS=READY_AFTER_ONE_HARNESS_FIX
FUTURE_EXECUTION=ONE_SINGLE_PROCESS_READ_ONLY_PREFLIGHT
FUTURE_EXECUTION_COUNT=1
REMOTE_WRITE_BUDGET=0
```

No fix or execution was performed in F3BQ. Runtime, wrapper, and environment
remain unchanged.
