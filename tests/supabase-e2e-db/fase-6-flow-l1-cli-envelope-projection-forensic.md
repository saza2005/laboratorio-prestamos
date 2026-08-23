# FASE 6.3B-L1-F3AD - CLI envelope projection

F3AC is preserved exactly. Its one remote single-process preflight failed
in baseline, while clean-state and L1 PRE were `NOT_REACHED`; no DNS cause
was established.

## Finding

The F3AB envelope used canonical fields such as `currentReadOrdinal`,
`currentReadPurposeClass`, `failureClass` and `stage`. The F3AC formatter
read legacy aliases (`ordinal`, `readClass`, and result-only fields), which
hid populated structured data as `UNKNOWN`.

F3AD adds a small sanitized projection with strict precedence:
canonical field, compatible legacy fallback only when absent, then
`UNKNOWN` or `NOT_REACHED`. It does not alter baseline reads, observers,
retry behavior, queries, or business invariants.

## Local result

Synthetic end-to-end tests pass for canonical-over-legacy precedence,
legacy fallback, full and partial envelopes, pre-first-read and read-N
progress, raw DNS evidence without raw hostname output, no-raw/no-DNS
inference, local exceptions, raw-throw fallback, `NOT_REACHED`, counters,
schema drift, import safety, network kill-switch and redaction.

```text
L1_F3AD_ROOT_CAUSE_CLASS=STALE_CLI_ALIAS_PROJECTION
L1_F3AD_ROOT_CAUSE_CONFIDENCE=HIGH
L1_F3AD_CHANGE_CLASS=COORDINATOR_FORMATTER_PROJECTION_ONLY
L1_F3AD_FORMATTER_PROJECTION_STATUS=CLOSED
L1_F3AD_F3AC_RETROACTIVE_FAILURE_RECLASSIFICATION=no
REMOTE_READS=0
STATE=CLEAN
```

The F3AB freeze is stale because the coordinator projection and freeze
target changed. The new canonical freeze is
`POST_F3AD_FORMATTER_PROJECTION_VALIDATED`. No remote execution occurred
in F3AD.

## F3AE result

The single authorized F3AE preflight passed freeze, isolation and
storageState. Baseline failed before read 1 with a structured local
exception at `OBSERVER_START`; the safe fingerprint class was
`ReferenceError`. The canonical formatter preserved the envelope, so the
F3AD projection contract held. Clean-state and L1 PRE were `NOT_REACHED`.
This is not DNS evidence and no retry or mutation occurred.
