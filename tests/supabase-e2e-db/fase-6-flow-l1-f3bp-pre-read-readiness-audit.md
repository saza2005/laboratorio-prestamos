# F3BP - PRE-read reconciliation and remote readiness audit

Phase: `F3BP`
Mode: `AUDIT_AND_DESIGN_ONLY`

## Findings

The four F3BO `OTHER_FILES` are all non-executable report/status artifacts:

```text
tests/supabase-e2e-db/fase-6-flow-l1-observer-start-reference-error-forensic.md
tests/supabase-e2e-db/fase-6-flow-l1-results.md
tests/supabase-e2e-db/fase-6-flow-l1-f3bn-f3af-observer-status-reconciliation.md
tests/supabase-e2e-db/fase-6-flow-l1-f3bo-f3af-formal-close.md
```

They have no runtime or harness impact.

The current single-process entrypoint is
`scripts/e2e/verify-mutating-l1-single-process-preflight.mjs`. Its call graph
is baseline core, then clean-state core, then L1 PRE core, with stop-on-first-
failure, zero child processes, no nested baseline, and no post-failure remote
checks. The L1 PRE contract remains `requests(purpose,comments)` followed by
`loans(notes)`, with no writes or business RPCs.

The bounded retry implementation remains max two attempts per read, one fresh
query on retry, a 1000 ms DNS-only backoff, and the unchanged allowlist:
`DNS_RESOLUTION_ERROR`, `CONNECTION_RESET`, `CONNECT_TIMEOUT`, and
`READ_TIMEOUT`. No third attempt or whole-verifier retry is reachable.

## Readiness blocker

The entrypoint's freeze gate still hardcodes
`POST_F3AD_FORMATTER_PROJECTION_VALIDATED` and
`.e2e-state/l1-f3ad-formatter-projection-manifest.json`. The active runtime
reference is `POST_F3BL_AMENDED_FREEZE`; therefore the current productive
single-process entrypoint is stale for a future remote execution.

No runtime, retry, or network fix is required. A future harness/coordinator
freeze-reference update must be authorized separately before the one remote
preflight.

```text
PRE_READ_READINESS=NOT_READY_COORDINATOR_STALE
MINIMUM_FUTURE_EXECUTION=ONE_SINGLE_PROCESS_READ_ONLY_PREFLIGHT
MINIMUM_FUTURE_EXECUTION_COUNT=1
MINIMUM_FUTURE_REMOTE_WRITE_BUDGET=0
NEW_TARGETED_REQUESTS_PROBE_REQUIRED=no
```

Historical DNS failures remain proven and preserved. The current classification
is intermittent environmental/process-context DNS; a future PASS cannot erase
that history, but can validate the current production-equivalent PRE path and
support forensic closure.

## Safety

```text
REMOTE_EXECUTIONS=0
REMOTE_READS=0
RUNTIME_FILES_CHANGED=0
HARNESS_FILES_CHANGED=0
ENV_FILES_CHANGED=0
NEXT_WORKSTREAM_STARTED=no
RUNTIME_HASH=af9edb8cee87057cbcfeb2e48fafd673da77705f3847fa28ab834a7feab8cec1
WRAPPER_HASH=45a591a673f6be33a373b118093463b8021ed72647c3046660e1dca088d4475c
```
