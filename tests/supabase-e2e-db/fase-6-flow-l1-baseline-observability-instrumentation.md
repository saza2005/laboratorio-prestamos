# FASE 6.3B-L1-F3Z - Baseline observability

F3Z was local-only. It preserves the historical F3X baseline failure and
the F3Y finding without reclassifying either as DNS.

## Implementation

The baseline core now uses the existing passive diagnostics-channel model
for all 18 READ_ONLY operations. Each operation has an explicit ordinal and
purpose class, attempt `1`, and sanitized result/transport correlation.
Baseline remains `NO_RETRY`: no delay, second attempt, fresh query, or
whole-core retry was added. The staging reads retain their original query
set and logical order and are serialized only to guarantee explicit
per-read correlation.

The baseline result preserves the first sanitized failure, read count,
read events, raw transport class when correlated, result/status class, host
classification, and zero-write counters. The single-process coordinator
now propagates this object instead of collapsing it to a generic failure.
Unexecuted downstream stages and process comparisons are reported as
`NOT_REACHED`.

## Local validation

F3Z synthetic tests passed for DNS normalization, no-raw/no-DNS inference,
HTTP classification, transient classification without retry, ordinal
propagation, coordinator failure propagation, unknown failure propagation,
all-pass budget, secret redaction, import safety, and network kill-switch.
The complete local L1 suite and R1-R4 regressions passed. ESLint retains the
three preexisting baseline warnings and no errors.

```text
L1_F3Z_BASELINE_PASSIVE_OBSERVER_INTEGRATED=yes
L1_F3Z_BASELINE_READ_CORRELATION_MODEL=EXPLICIT_LOCAL_CONTEXT
L1_F3Z_BASELINE_MAX_ATTEMPTS_PER_READ=1
L1_F3Z_BASELINE_RETRY_REACHABILITY=0
L1_F3Z_BASELINE_STRUCTURED_RESULT_COMPLETE=yes
L1_F3Z_COORDINATOR_BASELINE_DETAIL_PROPAGATION_FIXED=yes
L1_F3Z_COORDINATOR_FAILURE_DETAIL_LOSS_REACHABILITY=0
L1_F3Z_DOWNSTREAM_NOT_REACHED_REPORTING_FIXED=yes
L1_F3Z_L1_RETRY_CONTRACT_CHANGED=no
L1_F3Z_REMOTE_NETWORK_OPERATIONS=0
```

## Freeze

The F3W freeze is stale because runtime files changed. The new canonical
manifest is `POST_F3Z_BASELINE_OBSERVABILITY_VALIDATED`; its sanitized
self-check passed. No application, schema, RLS, RPC, or Auth code changed.

No remote validation was executed in F3Z.

## FASE 6.3B-L1-F3AA result

The one authorized F3AA coordinator invocation matched the F3Z freeze and
passed the local gates, but baseline failed before clean-state and L1 PRE.
The coordinator did not receive a structured baseline result in this
execution, so the failed read, transport class, and ordinal remain unknown.
No downstream stage, retry, post-failure check, browser, or write ran.

F3AB hardened the remaining exception path locally. F3AA remains the
historical remote result and is not reclassified.

```text
L1_F3AA_TOP_LEVEL_COORDINATOR_EXECUTIONS=1
L1_F3AA_BASELINE_CORE_EXECUTIONS=1
L1_F3AA_BASELINE_CORE_RESULT=FAIL
L1_F3AA_CLEAN_STATE_CORE_EXECUTIONS=0
L1_F3AA_L1_PRE_CORE_EXECUTIONS=0
L1_F3AA_NESTED_BASELINE_EXECUTIONS=0
L1_F3AA_POST_FAILURE_REMOTE_CHECK_EXECUTIONS=0
L1_F3AA_PROTOCOL_BUDGET_COMPLIANT=yes
L1_F3AA_FAILURE_CLASS=BASELINE_FAILURE_OBSERVABILITY_DEFECT_REMAINS
REMOTE_WRITES=0
STATE=CLEAN
```

## F3AC result

The single authorized remote coordinator passed freeze, isolation and
storage gates, then baseline failed once. Clean-state and L1 PRE were
`NOT_REACHED`; no post-failure remote check or mutation occurred. The CLI
formatter used legacy envelope field names, so the F3AB structured detail
was not rendered. F3AC adds no DNS evidence and remains open for a local
reporting correction.

F3AD locally corrected the formatter alias projection. The canonical F3AB
envelope now survives coordinator-to-CLI formatting without changing
baseline observability or retry behavior. The F3AB freeze is stale and the
new freeze is `POST_F3AD_FORMATTER_PROJECTION_VALIDATED`.

F3AE reached the baseline core and failed before the first read in
`OBSERVER_START` with a sanitized local `ReferenceError`. The formatter
preserved the canonical envelope; no DNS evidence or L1 PRE execution was
produced.
