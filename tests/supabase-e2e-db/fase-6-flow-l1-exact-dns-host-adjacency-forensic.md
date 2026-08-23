# FASE 6.3B-L1-F3L

## Scope

F3L performed one canonical production requests read in one Node process with the passive observer active. The diagnostic used production client creation, the production requests descriptor, and production `readTable`, with a diagnostic-only single-attempt limit. No loans read, full L1 PRE, browser, fixture, mutation, or preflight ran.

## Result

The E2E target identity and passive observer initialized successfully. The canonical requests read passed on attempt 1 with no transport failure and a successful PostgREST result. Because no DNS failure occurred, no post-failure lookup was authorized or executed.

The current canonical request path is healthy. F3F, F3G, F3I, and their DNS failures remain historical and unchanged; F3L does not reinterpret them as passes.

```text
L1_F3L_CURRENT_BEHAVIOR_CLASS=CURRENT_CANONICAL_REQUEST_PATH_HEALTHY
L1_F3L_ROOT_CAUSE_CLASS=INTERMITTENT_DNS_RESOLUTION_FAILURE
L1_F3L_ROOT_CAUSE_CONFIDENCE=MEDIUM
L1_F3L_POST_FAILURE_LOOKUP_EXECUTED=no

## F3M-FR1 freeze rebase

F3M-FR1 confirmed that F3L hostname comparison is diagnostic-only and its single-attempt mode cannot affect normal L1 PRE defaults. The post-F3L local freeze is now `POST_F3L_VALIDATED`.

## F3M-R2 result

The complete verifier observed DNS failure twice. The passive request and error lifecycle both reported `MISMATCH` against the expected E2E hostname. This is current evidence of an unexpected network target; no hostname value is persisted or exposed.

F3N later audited this comparator result locally. The production client and expected target use the same effective URL source, and the canonical request builder preserves that host. The verifier's prior passive-observer call omitted the target-host argument, so the historical `MISMATCH` is preserved as a comparator output but is not proof of a different destination. The verifier was corrected locally; this invalidates the prior runtime freeze manifest and does not authorize a new remote observation.
L1_PRE_EXECUTIONS=0
REMOTE_WRITES=0
STATE=CLEAN
```
