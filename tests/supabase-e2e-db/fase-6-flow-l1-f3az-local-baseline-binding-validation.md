# F3AZ - Local baseline binding validation

F3AZ consumed exactly one local `runBaselineCore()` execution with a
fail-closed `fetch` boundary. No coordinator, target, inspector, or remote
operation was executed.

The corrected `validateStateFiles(env, state, files, aliases)` path was
reached without `ReferenceError: env is not defined`; `validateContext()` and
the state-file validation path were therefore traversed successfully. The
execution later ended with a separate local `TypeError` classified by the
baseline envelope at `READ_COMPLETE`, so this phase validates only the F3AY
binding blocker, not complete baseline success.

The amended freeze hash remained intact and all non-exempt hashes matched.
