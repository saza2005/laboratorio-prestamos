# F3BM - post-F3BL local dynamic validation

Phase: `F3BM`
Mode: `SINGLE_LOCAL_WRAPPER_EXECUTION`

## Execution

The wrapper was executed exactly once:

```text
scripts/e2e/test-flow-l1-f3bb-local-baseline-network-killswitch.mjs
```

It returned exit code `1` with the verifier's structured validation output:

```text
RELATIONSHIPS: FAIL
QUANTITATIVE_INVARIANTS: FAIL
FINAL_RESULT: FAIL
```

No unexpected exception was emitted. The negative result is the expected
fail-closed validation result for locally blocked reads, not a verifier
runtime failure.

## Dynamic evidence

```text
AUTH_SECTION_REACHED=yes
AUTH_LOCAL_BRANCH_DIRECTLY_OBSERVED=no
AUTH_PROGRESS_ALLOWED=yes
STATE_FILES=PASS
RELATIONSHIPS=FAIL
QUANTITATIVE_INVARIANTS=FAIL
RELATIONS_MISSING_RECORD_GUARD_TRIGGERED=yes
RELATIONS_RESULT=BOOLEAN_FALSE
QUANTITATIVE_MISSING_RECORD_GUARD_TRIGGERED=yes
QUANTITATIVE_RESULT=BOOLEAN_FALSE
RELATIONS_TYPEERROR_REPRODUCED=no
QUANTITATIVE_TYPEERROR_REPRODUCED=no
ENV_REFERENCEERROR_REPRODUCED=no
F3BL_DYNAMIC_VALIDATION=PASS
F3BB_DYNAMIC_VALIDATION=PASS
VERIFIER_TERMINATION=EXPECTED_FAIL_CLOSED_VALIDATION_FAILURE
```

The output demonstrates that execution progressed through `relationsOk` and
`quantitativeOkFn`. The table reads remained behind the global fetch
killswitch, so the missing collections were not synthetically injected.

## Network and integrity

```text
KILLSWITCH_INTERCEPTION_OBSERVED=yes
REAL_NETWORK_ESCAPE_OBSERVED=no
ORIGINAL_FETCH_RESTORATION_COMPLETED=yes
REMOTE_READS=0
DNS_QUERY_EXECUTIONS=0
HTTP_EXECUTIONS=0
TLS_EXECUTIONS=0
REMOTE_WRITES=0
TARGET_EXECUTIONS=0
COORDINATOR_EXECUTIONS=0
INSPECTOR_SESSION_EXECUTIONS=0
```

```text
POST_F3BL_RUNTIME_HASH=af9edb8cee87057cbcfeb2e48fafd673da77705f3847fa28ab834a7feab8cec1
POST_F3BI_WRAPPER_HASH=45a591a673f6be33a373b118093463b8021ed72647c3046660e1dca088d4475c
RUNTIME_HASH_CHANGED_DURING_EXECUTION=no
WRAPPER_HASH_CHANGED_DURING_EXECUTION=no
```

F3AF remains open. Quantity-control forensic status remains open. No target,
coordinator, inspector, runtime, wrapper, or environment change was made.
