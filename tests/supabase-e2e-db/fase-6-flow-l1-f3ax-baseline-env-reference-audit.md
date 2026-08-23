# F3AX - Baseline environment binding audit

F3AX was audit/design-only. No target, coordinator, inspector, or remote
operation was executed.

## Proven defect

`runBaselineCoreUnsafe()` creates the validated local binding `env` at line
17 and correctly passes it to `validateContext(env, state)` at line 53.
The next validation calls `validateStateFiles(state, files, expectedAliases)`
without that binding. Inside `validateStateFiles()` line 138, the final
expression calls `validateContext(env, state)`, but `env` is neither a
parameter nor a module/global binding. The exact defect is an unbound lexical
identifier.

The intended value is the same validated environment snapshot already owned by
`runBaselineCoreUnsafe()`, specifically its parsed URL and expected project
reference. Replacing it with `process.env` would be semantically weaker and
would bypass the existing `loadEnv()` validation/provenance.

## Minimum design

The preferred future correction is an internal helper-parameter repair in
`scripts/e2e/verify-baseline.mjs`: pass the existing `env` binding to
`validateStateFiles()` and accept it in that helper before calling
`validateContext()`. This is one frozen file, one helper binding, and preserves
the existing validation and project-isolation semantics.

The defect is more precisely `E2E_VERIFIER_RUNTIME`, refining F3AW's broader
`APPLICATION_RUNTIME` label. It is an independent baseline precondition blocker
for evaluating the earlier F3AF observer-start issue; F3AF remains open.

Current file hash was captured for the future exception phase:

`4eb0d4a8c786ba8d31ee9dd64deb34e0f26e2501bfdc0f860bdec62d8472db75`

No fix was applied and the freeze remains valid.
