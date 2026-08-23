# F3BL - relationsOk missing-record guard fix

Phase: `F3BL`
Purpose: `RELATIONS_OK_MISSING_RECORD_FAIL_CLOSED_GUARD_FIX`
Mode: `SCOPED_FREEZE_EXCEPTION_FIX_ONLY`

## Result

The authorized one-file exception was applied only to `relationsOk` in
`scripts/e2e/verify-baseline.mjs`. The helper now resolves the required
relation aliases and records before evaluating the existing comparisons. If
any required record is absent, it returns the existing boolean failure value,
`false`.

The guard covers the tracked and bulk item aliases, the teacher-group request
alias, the first request group, its first group-item record, and the tracked
unit used by the existing property accesses. No request, ID, or default record
was fabricated. The valid-data comparisons remain semantically unchanged.

## Static evidence

```text
PRE_F3BB_HASH=784fac0f0a2e3eef07924dc5b42812eabdf08b4d08fde404f8237ebfe4e5a0a7
POST_F3BL_HASH=af9edb8cee87057cbcfeb2e48fafd673da77705f3847fa28ab834a7feab8cec1
WRAPPER_POST_F3BI_HASH=45a591a673f6be33a373b118093463b8021ed72647c3046660e1dca088d4475c
SYNTAX_VALIDATION=PASS
RELATIONS_GUARD_STATIC_VALIDATION=PASS
UNGUARDED_REQUIRED_RELATION_DEREFERENCE_REMAINS=no
VALID_RELATION_PATH_STATICALLY_PRESERVED=yes
RELATIONS_EMPTY_REQUEST_PATH_STATIC_RESULT=BOOLEAN_FALSE
RELATIONS_TYPEERROR_PATH_STATICALLY_ELIMINATED=yes
QUANTITATIVE_REACHABILITY_AFTER_RELATIONS_FALSE=yes
OPTIONAL_CHAINING_ONLY_FIX_USED=no
SYNTHETIC_DEFAULT_RECORDS_CREATED=no
```

## Scope and safety

```text
AUTHORIZED_RUNTIME_FILE=scripts/e2e/verify-baseline.mjs
AUTHORIZED_SYMBOL=relationsOk
RUNTIME_FILES_CHANGED=1
HARNESS_FILES_CHANGED=0
ENV_FILES_CHANGED=0
TARGET_EXECUTIONS=0
BASELINE_EXECUTIONS=0
WRAPPER_EXECUTIONS=0
COORDINATOR_EXECUTIONS=0
INSPECTOR_SESSION_EXECUTIONS=0
REMOTE_OPERATIONS=0
```

`POST_F3BL_AMENDED_FREEZE` is established as `POST_F3BB_AMENDED_FREEZE` with
only the authorized hash replacement for `verify-baseline.mjs`. The F3AY
environment binding, F3BB quantitative guard, project isolation, and F3BI
wrapper remain intact. F3AF and quantity-control forensic status remain open.
