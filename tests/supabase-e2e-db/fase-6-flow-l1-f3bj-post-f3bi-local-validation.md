# F3BJ - Post-F3BI local validation

Phase: `F3BJ`
Mode: `SINGLE_LOCAL_WRAPPER_EXECUTION`

## Result

The post-F3BI wrapper was started exactly once. It exited with status `1` and
produced no structured verifier output. No retry was performed.

The absence of the previous `LOCAL_NETWORK_KILLSWITCH` diagnostic indicates
that the Auth route branch did not fail in the same way, but the wrapper has no
runtime counters and emitted no result fields, so Auth acceptance and the
post-Auth stages are recorded as `UNPROVEN` rather than asserted.

Static control-flow analysis identifies the next likely exception after all
non-Auth reads fail closed: `relationsOk()` dereferences
`ids.requests.E2E_REQUEST_TEACHER_GROUP.id` after `requests.rows` is empty. That
exception occurs before the `quantitativeOkFn` call at the following statement.
This is not a dynamic validation of F3BB.

```text
WRAPPER_EXECUTIONS=1
EXIT_CODE=1
STRUCTURED_OUTPUT=ABSENT
AUTH_BRANCH_RUNTIME_RESULT=UNPROVEN
QUANTITATIVE_OK_FN_REACHED=UNPROVEN
F3BB_DYNAMIC_VALIDATION=NOT_EVALUATED
REAL_NETWORK_ESCAPE=no
```

## Integrity

```text
WRAPPER_POST_EXECUTION_HASH=45a591a673f6be33a373b118093463b8021ed72647c3046660e1dca088d4475c
VERIFY_BASELINE_HASH=784fac0f0a2e3eef07924dc5b42812eabdf08b4d08fde404f8237ebfe4e5a0a7
WRAPPER_HASH_CHANGED_DURING_EXECUTION=no
RUNTIME_FILES_CHANGED=0
HARNESS_FILES_CHANGED=0
ENV_FILES_CHANGED=0
REMOTE_OPERATIONS=0
```

F3BJ did not modify the wrapper or runtime and does not authorize a follow-up
execution or fix.
