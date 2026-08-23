# FASE 6.3B-L1-F3AJ - Provenance harness alias fix

F3AI remains preserved exactly. Its exact-prefix inspector execution aborted
before producing valid target-event provenance. F3AJ changed only the local
forensic harness `scripts/e2e/test-flow-l1-f3ai-exact-prefix-inspector.mjs`.

## Harness correction

The stale projection expected an exception-envelope field without accepting
the current canonical result shape. The harness now checks the canonical
stage and fingerprint fields, with explicit compatibility handling. The
synthetic mapping and schema-drift guard pass. No alias exists in the frozen
runtime and runtime contract impact is `NONE`.

The one authorized corrected exact-prefix execution still terminated because
the coordinator result did not contain the assumed exception envelope shape.
Therefore F3AJ does not claim that the target ReferenceError was captured,
nor that a throw site was identified. No second execution was made.

```text
L1_F3AJ_F3AI_TARGET_THROW_EVENT_PROVENANCE=NOT_REACHED_DUE_TO_HARNESS_ABORT
L1_F3AJ_F3AI_THROW_SITE_EVIDENCE_VALID=no
L1_F3AJ_OBSOLETE_HARNESS_ALIAS_PROVEN=yes
L1_F3AJ_ALIAS_DEFECT_LAYER=FORENSIC_HARNESS
L1_F3AJ_ALIAS_EXISTS_IN_FROZEN_RUNTIME=no
L1_F3AJ_RUNTIME_CONTRACT_IMPACT=NONE
L1_F3AJ_HARNESS_ALIAS_FIX_APPLIED=yes
L1_F3AJ_HARNESS_CANONICAL_MAPPING_TEST=PASS
L1_F3AJ_HARNESS_SCHEMA_DRIFT_GUARD=PASS
L1_F3AJ_EXACT_PREFIX_INSPECTOR_EXECUTIONS=1
L1_F3AJ_TARGET_REFERENCEERROR_EVENT_CAPTURED=no
L1_F3AJ_EXACT_PREFIX_RESULT=HARNESS_FAILURE
L1_F3AJ_RUNTIME_FIX_APPLIED=no
L1_F3AJ_RUNTIME_FILES_CHANGED_COUNT=0
L1_F3AJ_RUNTIME_FREEZE_CHANGED=no
L1_F3AJ_POST_F3AD_FREEZE_REMAINS_VALID=yes
L1_F3AJ_ROOT_CAUSE_CLASS=PROVENANCE_HARNESS_DEFECT_REMAINS
L1_F3AJ_ROOT_CAUSE_CONFIDENCE=HIGH
L1_F3AJ_ENVIRONMENT_SPECIFIC_CAUSE_PROVEN=no
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
REMOTE_WRITES=0
```

The next safe step is another narrowly scoped local harness correction only;
remote execution and production runtime changes remain unauthorized.
