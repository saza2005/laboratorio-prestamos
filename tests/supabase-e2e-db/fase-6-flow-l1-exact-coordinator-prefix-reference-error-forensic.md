# FASE 6.3B-L1-F3AG - Exact coordinator prefix

F3AE and F3AF remain preserved. F3AG executed exactly one local prefix
with the current coordinator import order, real freeze/isolation/storage
gates, real baseline core, real default observer and a hard network
kill-switch installed before baseline.

F3AI preserved this result and performed no second remote or runtime

F3AJ preserved this history. The corrected provenance harness still failed
after the coordinator call, so no new throw-site evidence was accepted.
execution. The later local inspector harness did not establish a new throw
site.

## Result

Unlike the standalone observer harness, the exact coordinator prefix
reproduced the structured `ReferenceError` at `OBSERVER_START` before read
1. No network or table read occurred. The exact symbol and source line are
not yet localized; no runtime correction was made.

```text
L1_F3AG_EXACT_PREFIX_REPRO_EXECUTIONS=1
L1_F3AG_EXACT_PREFIX_MAX_STAGE=OBSERVER_START
L1_F3AG_REFERENCE_ERROR_REPRODUCED_IN_EXACT_PREFIX=yes
L1_F3AG_REFERENCE_ERROR_SITE_PROVEN=no
L1_F3AG_ROOT_CAUSE_CLASS=REFERENCE_ERROR_REMAINS_UNRESOLVED
L1_F3AG_ROOT_CAUSE_CONFIDENCE=MEDIUM
L1_F3AG_RUNTIME_FILES_CHANGED_COUNT=0
L1_F3AG_RUNTIME_FREEZE_CHANGED=no
L1_F3AG_POST_F3AD_FREEZE_REMAINS_VALID=yes
REMOTE_READS=0
STATE=CLEAN
```

The remaining differential is the coordinator prefix/runtime context. No
second reproduction and no remote rerun are authorized.
