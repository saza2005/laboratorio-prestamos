# FASE 6.3B-L1-F3AI - V8 throw provenance

F3AI was local-only and preserved F3AE, F3AF, F3AG, and F3AH exactly. No
runtime file covered by `POST_F3AD_FORMATTER_PROJECTION_VALIDATED` changed.

## Factor audit

The four F3AH factor runs were not true single-factor differentials. Each
shared the coordinator-style harness prefix that was absent from the healthy
standalone control. The historical F3AH output remains unchanged; its factor
matrix is interpreted as `CONFOUNDED_BY_COMMON_PREFIX`. No new factor matrix
or pairwise experiment was executed.

## Inspector experiments

The synthetic in-process inspector calibration passed. It used
`inspector.Session`, enabled exception pausing, and did not open a debugger
socket or read exception descriptions.

The one authorized exact-prefix experiment started with the same local
coordinator path and network kill-switch. Its reporting harness asserted an
internal field alias that is not present in the returned baseline object and
terminated before emitting the paused-event projection. Consequently F3AI
does not claim a captured V8 throw site, repository frame, symbol, or causal
import/cache trigger. The experiment was not repeated.

```text
L1_F3AI_INSPECTOR_MODE=IN_PROCESS_SESSION_ONLY
L1_F3AI_INSPECTOR_CAUGHT_EXCEPTION_CALIBRATION=PASS
L1_F3AI_EXACT_PREFIX_INSPECTOR_EXECUTIONS=1
L1_F3AI_INSPECTOR_RAW_EXCEPTION_DESCRIPTION_READ=0
L1_F3AI_INSPECTOR_OPEN_EXECUTIONS=0
L1_F3AI_EXTERNAL_DEBUG_SOCKET_COUNT=0
L1_F3AI_RUNTIME_FIX_APPLIED=no
L1_F3AI_RUNTIME_FILES_CHANGED_COUNT=0
L1_F3AI_RUNTIME_FREEZE_CHANGED=no
L1_F3AI_POST_F3AD_FREEZE_REMAINS_VALID=yes
L1_F3AI_ROOT_CAUSE_CLASS=THROW_EVENT_CAPTURED_SITE_UNRESOLVED
L1_F3AI_ROOT_CAUSE_CONFIDENCE=LOW
L1_F3AI_ENVIRONMENT_SPECIFIC_CAUSE_PROVEN=no
```

No DNS, HTTP, TLS, Supabase read, browser, mutation, retry, or production
correction occurred. The next safe step is a narrowly corrected local
inspector harness only if provenance remains necessary; no remote execution
is authorized.

F3AJ corrected one stale harness projection, but the single authorized retry
still aborted on an assumed exception-envelope shape. This does not alter the
F3AI historical output and does not establish target throw-event provenance.
