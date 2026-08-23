# F3BK - relationsOk TypeError and ordering audit

Phase: `F3BK`
Mode: `AUDIT_ONLY`

## Finding

`relationsOk` is `scripts/e2e/verify-baseline.mjs:148` and is called at line
111. `quantitativeOkFn` is called immediately afterward at line 113. The
function is intended to return a boolean.

With fail-closed `requests.rows=[]`, the call builds `ids.requests={}`. The
first high-confidence missing-record dereference is:

```text
ids.requests.E2E_REQUEST_TEACHER_GROUP.id
```

The optional chain on `groups.rows[0]` does not protect the right-hand side of
the equality, so evaluation proceeds to the missing request alias and then
dereferences `.id`. This is a verifier runtime TypeError and prevents the
subsequent `quantitativeOkFn` statement from running.

Other shape-sensitive candidates exist for malformed inputs, including
`.every()` calls on the expected arrays and `units.find(...).id`, but they are
not the primary empty-requests path.

## Input provenance and intended semantics

The empty request collection is supported by the existing read result shape:
`runBaselineRead()` returns `{ ok: false, rows: [], error, failure }` after a
local killswitch failure. No request records are synthetically injected. The
available evidence is static inference from the F3BJ control path; F3BJ did
not preserve a runtime stack or structured output proving the collection at
the instant of failure.

`relationsOk` should return its normal boolean failure representation, `false`,
when required relation records are absent. Missing data must never produce a
PASS.

## Minimum future fix design

The minimum candidate is one guard at the start of `relationsOk` in
`scripts/e2e/verify-baseline.mjs` that checks the required relation containers
and the request alias used by the expression, returning `false` when missing.
The valid-data expression remains unchanged. This is analogous to the F3BB
missing-record guard, but it is a separate verifier defect and requires a new
freeze exception.

```text
FIX_LAYER=E2E_VERIFIER_RUNTIME
FIX_SCOPE=ONE_HELPER_ONE_MISSING_RELATION_GUARD
PUBLIC_INTERFACE_CHANGE=no
PROJECT_ISOLATION_CHANGE=no
ENV_PROVENANCE_CHANGE=no
```

No runtime, wrapper, environment, or freeze file was modified in F3BK. No
execution occurred.
