# FASE 6.3B-L1-F3AK - Provenance harness event-order contract

F3AE through F3AJ remain preserved exactly. F3AK is local-only and does not
execute the exact prefix that reproduces the historical target ReferenceError.

## Finding

The F3AJ harness asserted post-catch result fields immediately after the
coordinator call. Those fields are only available after baseline catch and
envelope construction; they are not prerequisites for arming the inspector
or capturing a V8 paused event. This is a forensic harness pre-event ordering
defect, not a production runtime defect.

The harness now models PRE_EVENT, THROW_EVENT, and POST_EVENT separately.
Captured structural throw evidence is retained when the later envelope is
absent. A missing post-event artifact is classified as
`THROW_CAPTURED_POST_EVENT_ENVELOPE_UNAVAILABLE`, never as `HARNESS_FAILURE`.

```text
L1_F3AK_F3AJ_ABORT_PRECONDITION_PROVEN=yes
L1_F3AK_ABORT_PRECONDITION_LAYER=FORENSIC_HARNESS
L1_F3AK_ABORT_PRECONDITION_FIELD_CLASS=POST_CATCH_ENVELOPE_ONLY
L1_F3AK_ABORT_PRECONDITION_STAGE=POST_EVENT_RESULT_ASSERTION
L1_F3AK_ABORT_FIELD_AVAILABILITY_CLASS=POST_CATCH_ENVELOPE_ONLY
L1_F3AK_PRE_EVENT_ORDERING_DEFECT_PROVEN=yes
L1_F3AK_HARNESS_STATE_MACHINE_RECONSTRUCTED=yes
L1_F3AK_PRE_EVENT_ENVELOPE_DEPENDENCY_REACHABILITY=0
L1_F3AK_THROW_CAPTURE_INDEPENDENT_OF_ENVELOPE=yes
L1_F3AK_POST_EVENT_ENVELOPE_CORRELATION_READY=yes
L1_F3AK_THROW_PROVENANCE_REQUIRES_ENVELOPE=no
L1_F3AK_PRODUCTIVE_ENVELOPE_CONTRACT_CHANGED=no
L1_F3AK_HARNESS_FAILURE_SEMANTICS_HARDENED=yes
L1_F3AK_HARNESS_PRECONDITION_FIX_APPLIED=yes
L1_F3AK_INSPECTOR_HELPER_CHANGED=no
L1_F3AK_TARGET_REFERENCEERROR_EXACT_PREFIX_EXECUTIONS=0
L1_F3AK_RUNTIME_FILES_CHANGED_COUNT=0
L1_F3AK_RUNTIME_FREEZE_CHANGED=no
L1_F3AK_POST_F3AD_FREEZE_REMAINS_VALID=yes
L1_F3AK_ALL_RUNTIME_HASHES_MATCH=yes
L1_F3AK_ROOT_CAUSE_CLASS=PROVENANCE_HARNESS_PRE_EVENT_ENVELOPE_DEPENDENCY_DEFECT
L1_F3AK_ROOT_CAUSE_CONFIDENCE=HIGH
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
REMOTE_WRITES=0
```

All tests use synthetic local state and no network. The next safe step is one
separately authorized local exact-prefix provenance execution using this
corrected harness.
