# FASE 6.3B-L1-F3Y - Baseline failure forensic

F3Y was local-only. The historical F3X result remains unchanged:
`BASELINE_CORE_FAILURE_UNCLASSIFIED`, baseline core `1`, clean-state `0`,
L1 PRE `0`, nested baseline `0`, and post-failure remote checks `0`.

The downstream process comparison is semantically `NOT_REACHED`; the
historical `no` fields are not evidence that downstream processes differed.

## Static baseline call graph

The baseline core contains 18 READ_ONLY remote operations in this order:
auth users, profiles, items, item units, requests, request items, request
groups, request group items, loans, loan items, returns, return items,
maintenance, inventory movements, three staging reads, and audit logs.
The F3X artifact set contains no persisted baseline structured result,
stage marker, or sanitized baseline error artifact. Therefore the failure
ordinal and purpose cannot be determined from preserved evidence.

## Classification

The baseline core source statically preserves its pre-F3W query set,
success criteria, service-role read context, and CLI result mapping. Its
low-level `read()` helper collapses any Supabase error to `read_failed`, and
the baseline core has no passive transport observer. The F3X coordinator
also discarded the structured baseline object when `baseline.ok` was false,
leaving only `BASELINE_CORE_FAILURE_UNCLASSIFIED` in stdout.

Consequently the underlying baseline failure is
`UNKNOWN_INSUFFICIENT_OBSERVABILITY`; DNS, HTTP, semantic, authorization,
and invariant categories are not proven. The demonstrated defect is
`COORDINATOR_FAILURE_CLASSIFICATION_DEFECT`, with a separate baseline
transport-observability gap. No baseline retry is authorized or added.

## F3Y result

```text
L1_F3Y_F3X_PROCESS_COMPARISON_REINTERPRETATION=DOWNSTREAM_NOT_REACHED
L1_F3Y_F3X_PROCESS_BOUNDARY_TEST_COMPLETED=no
L1_F3Y_BASELINE_INTERNAL_READ_COUNT=18
L1_F3Y_BASELINE_FAILURE_READ_ORDINAL=UNKNOWN
L1_F3Y_BASELINE_FAILURE_READ_PURPOSE_CLASS=UNKNOWN
L1_F3Y_BASELINE_FAILURE_CLASS=UNKNOWN_INSUFFICIENT_OBSERVABILITY
L1_F3Y_BASELINE_FAILURE_CLASSIFIABLE=no
L1_F3Y_BASELINE_RAW_TRANSPORT_OBSERVER_ACTIVE=no
L1_F3Y_BASELINE_RAW_TRANSPORT_EVIDENCE_AVAILABLE=no
L1_F3Y_BASELINE_RAW_TRANSPORT_CLASS=UNKNOWN
L1_F3Y_BASELINE_POSTGREST_DATA_CLASS=UNKNOWN
L1_F3Y_BASELINE_POSTGREST_ERROR_PRESENT=unknown
L1_F3Y_BASELINE_POSTGREST_STATUS_CLASS=UNKNOWN
L1_F3Y_BASELINE_FETCH_REJECTION_NORMALIZATION_COMPATIBLE=yes
L1_F3Y_BASELINE_RETRY_POLICY=NO_RETRY
L1_F3Y_BASELINE_RETRY_EXECUTIONS_IN_F3X=0
L1_F3Y_BASELINE_OBSERVABILITY_CHANGE_REQUIRED=yes
L1_F3Y_COORDINATOR_RECEIVED_BASELINE_DETAIL=no
L1_F3Y_COORDINATOR_FAILURE_DETAIL_LOSS_REACHABILITY=1
L1_F3Y_FAILURE_CLASSIFICATION_LOSS_LAYER=COORDINATOR_LAYER
L1_F3Y_ROOT_CAUSE_CLASS=COORDINATOR_FAILURE_CLASSIFICATION_DEFECT
L1_F3Y_ROOT_CAUSE_CONFIDENCE=HIGH
```

No runtime file was changed. A future local-only correction must preserve
the no-retry baseline policy and return sanitized structured failure detail
through the coordinator before any remote rerun is considered.

F3Z implemented and locally validated that correction. The historical F3Y
classification remains preserved; F3Z does not retroactively classify F3X.

F3AA still failed before downstream stages and did not provide structured
baseline evidence. This is preserved as new failure evidence, without
reclassifying the underlying remote read.

F3AB added the structured exception envelope and progress journal required
to preserve future baseline failures through the coordinator.

F3AC consumed its one authorized remote execution. Baseline failed once,
downstream stages were `NOT_REACHED`, and the output formatter discarded
the new envelope fields by reading legacy aliases. This is a reporting
boundary defect, not DNS evidence; no retry or mutation occurred.

F3AE provides the first post-F3AD remote result: a structured local
observer-start exception before read 1. The process budget remained
compliant and downstream stages were not reached.

F3AD reproduced this loss with synthetic input and fixed only the
coordinator formatter projection. The actual F3AC network/business cause
remains unknown and is not retroactively reclassified.
