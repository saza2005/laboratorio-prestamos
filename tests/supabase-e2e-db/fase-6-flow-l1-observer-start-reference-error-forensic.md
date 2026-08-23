# FASE 6.3B-L1-F3AF - Observer startup ReferenceError

F3AE is preserved exactly: one remote preflight, baseline failed before
read 1 at `OBSERVER_START` with structured `ReferenceError`, and no table
read, clean-state, L1 PRE, DNS evidence or mutation occurred.

F3AI preserved this evidence. Its in-process inspector calibration passed,

F3AJ changed only the forensic inspector harness. The target ReferenceError
was not validly captured and no observer/runtime correction was made.
but the exact-prefix provenance projection aborted on a harness field-alias
assertion; no production fix was authorized.

## Local audit

The real `startPassiveObserver` path was constructed and stopped locally
with a hard network kill-switch. A synthetic first read using the real
observer also passed without network. The remote ReferenceError could not
be reproduced from the current source, so its exact lexical site is not
proven and no speculative fix was applied.

```text
L1_F3AF_PRODUCTION_OBSERVER_START_PATH_RECONSTRUCTED=yes
L1_F3AF_REFERENCE_ERROR_SITE_PROVEN=no
L1_F3AF_REFERENCE_ERROR_LOCAL_REPRODUCED=no
L1_F3AF_REPRO_USED_REAL_OBSERVER_START_PATH=yes
L1_F3AF_OBSERVER_NETWORK_SEMANTICS_CHANGED=no
L1_F3AF_REMOTE_NETWORK_OPERATIONS=0
L1_F3AF_OBSERVER_START_FIX_STATUS=CLOSED_NO_OBSERVER_FIX_REQUIRED
STATE=CLEAN
```

The existing F3AD freeze remains canonical. A new freeze requires a
proven local correction followed by full regression.
