# FASE 6.3B-L1-F3M-FR1

## Result

The post-F3K changes were inventoried. They consist of hostname-comparison diagnostics, the passive observer diagnostic extension, and the explicit `maxAttempts=1` override used only by the isolated F3L diagnostic. No L1 PRE query descriptor, success criterion, business invariant, or normal retry policy changed.

The production default remains two attempts per exact read, with one recovery only for the approved transient classes. A synthetic diagnostic-then-production sequence confirms that the F3L single-attempt override cannot leak into normal execution. Hostname comparison is observational and retry-neutral.

Local F3M freeze-rebase tests, passive bridge tests, quantity tests, verifier tests, F1/F2 regressions, R1-R4 regressions, TypeScript, Node checks, and directed ESLint passed. The global ESLint baseline remains pre-existing and unchanged.

## New freeze

The current post-F3L runtime baseline is established locally as `POST_F3L_VALIDATED`. The sanitized ignored manifest contains hashes for four runtime-critical files: `clean-state-diagnostics`, `l1-passive-observer`, `l1-pre-readtable`, and `verify-mutating-flow-l1`.

No remote read, DNS operation, browser, fixture, mutation, business RPC, staging, or commit occurred.

```text
L1_F3M_FREEZE_REBASE_STATUS=CLOSED
L1_F3M_CANONICAL_FREEZE_BASELINE=POST_F3L_VALIDATED
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
DNS_QUERY_EXECUTIONS=0
BASELINE_RESTORED=yes
STATE=CLEAN
```

## F3M-R2 result

The post-F3L freeze matched and all local gates passed. The one authorized complete L1 PRE failed on requests with DNS resolution on attempts 1 and 2; one recovery was consumed, no third attempt occurred, and loans were not reached. Passive Undici evidence reported hostname `MISMATCH` against the expected E2E host. No final preflight ran.

## F3N-FR2 comparator freeze rebase

F3N-FR2 confirmed locally that the historical `MISMATCH` was caused by the verifier omitting the expected host when constructing the passive observer. The corrected verifier derives the effective URL once and passes it explicitly to the client factory and observer. Missing expected-target diagnostics now fail closed as `EXPECTED_TARGET_MISSING`.

`POST_F3L_VALIDATED` remains stale and was not overwritten. The new five-file sanitized manifest is `POST_F3N_COMPARATOR_VALIDATED`; its self-check passed. No remote operation occurred.
