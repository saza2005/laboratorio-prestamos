# FASE 6.3B-L1-F3AB - Baseline exception path

F3AA remains preserved exactly: one coordinator execution, baseline failed,
clean-state and L1 PRE were `NOT_REACHED`, and no post-failure remote check
ran. F3AB was local-only and did not reclassify F3AA as DNS.

F3AI preserved the later F3AE/F3AF/F3AG/F3AH history and did not alter the

F3AJ preserved the exception-path contract and made no runtime change.
baseline exception contract, retry policy, query contract or freeze.

## Finding

The baseline core now has an outer structured exception boundary. It keeps
an in-memory progress context before and after every one of the 18 reads,
including the current ordinal, purpose class, started/completed counts and
last completed read. Setup, observer start/stop, correlation, callback,
result construction and unexpected local exceptions are represented by a
sanitized exception envelope.

The coordinator preserves that envelope and maps raw unexpected throws to a
sanitized `BASELINE_UNEXPECTED_LOCAL_EXCEPTION` result. Downstream stages
remain `NOT_REACHED`, and cross-core process comparisons are not reported as
`no` when they were not exercised.

No retry, backoff, second attempt, query, target or business invariant was
added or changed.

## Local result

Synthetic exception-path tests passed for pre-read setup, read N, observer
callback, correlation, host comparison, result construction, cleanup,
redaction, coordinator propagation and stop-on-failure. TypeScript, Node
checks, directed ESLint, the complete local L1 suite and R1-R4 regressions
passed. No network operation occurred.

```text
L1_F3AB_BASELINE_EXCEPTION_ENVELOPE_READY=yes
L1_F3AB_BASELINE_PROGRESS_CONTEXT_READY=yes
L1_F3AB_UNSTRUCTURED_BASELINE_FAILURE_REACHABILITY=0
L1_F3AB_COORDINATOR_FAILURE_DETAIL_LOSS_REACHABILITY=0
L1_F3AB_BASELINE_MAX_ATTEMPTS_PER_READ=1
L1_F3AB_BASELINE_RETRY_REACHABILITY=0
L1_F3AB_ROOT_CAUSE_CLASS=BASELINE_EXCEPTION_OUTSIDE_STRUCTURED_BOUNDARY
L1_F3AB_ROOT_CAUSE_CONFIDENCE=HIGH
L1_F3AB_BASELINE_EXCEPTION_PATH_STATUS=CLOSED
```

The F3Z freeze is stale. The canonical local freeze is
`POST_F3AB_BASELINE_EXCEPTION_PATH_VALIDATED`; self-check and secret scan
passed. No remote validation was authorized or executed.

## F3AC remote result

F3AC consumed its single authorized coordinator execution. Freeze,
isolation and storage gates passed. The baseline core executed once and
failed; clean-state and L1 PRE were not reached, with no post-failure
remote check. The CLI output did not expose the F3AB envelope fields:
the formatter reads legacy aliases instead of `currentReadOrdinal`,
`currentReadPurposeClass` and `failureClass`. Consequently F3AC provides
no new DNS evidence and the envelope/reporting contract remains broken at
the output boundary. No retry or mutation occurred.

```text
L1_F3AC_SINGLE_PROCESS_PREFLIGHT_RESULT=FAIL
L1_F3AC_BASELINE_CORE_EXECUTIONS=1
L1_F3AC_CLEAN_STATE_CORE_EXECUTIONS=0
L1_F3AC_L1_PRE_CORE_EXECUTIONS=0
L1_F3AC_NESTED_BASELINE_EXECUTIONS=0
L1_F3AC_POST_FAILURE_REMOTE_CHECK_EXECUTIONS=0
L1_F3AC_F3AB_ENVELOPE_CONTRACT_BROKEN=yes
L1_F3AC_FAILURE_CLASS=BASELINE_EXCEPTION_ENVELOPE_DEFECT_REMAINS
REMOTE_WRITES=0
STATE=CLEAN
```

## F3AD projection correction

F3AD reproduced the F3AC display loss locally and corrected only the
coordinator/CLI result projection. Canonical F3AB fields now take
precedence over legacy aliases; populated fields cannot collapse to
`UNKNOWN`. F3AC remains historical and is not reclassified as DNS.

F3AE confirmed the projection fix: the baseline exception envelope was
rendered with `OBSERVER_START`, `NOT_STARTED`, zero reads and the safe
`ReferenceError` fingerprint. The remaining failure is a local observer
startup issue, not a transport classification.
