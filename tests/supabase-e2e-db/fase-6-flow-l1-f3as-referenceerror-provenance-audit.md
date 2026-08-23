# F3AS - ReferenceError provenance audit

F3AS was audit-only. No target, coordinator, inspector session, or remote
operation was executed.

## Preserved F3AR evidence

F3AR observed one paused `ReferenceError` with opaque `scriptId=157`, line
138, column 837, and at least one call frame. The harness intentionally
preserved only structural fields and did not persist the URL, message, source
map metadata, call-frame count, or raw stack.

## Reconstructed control flow

`runSingleProcessPreflight()` executes freeze, project isolation, and storage
gates, then increments the baseline counter and awaits `runBaselineCore()`.
`runBaselineCore()` sets `progress.stage` to `OBSERVER_START`, constructs the
real passive observer, and catches any local exception into
`BASELINE_UNEXPECTED_LOCAL_EXCEPTION` via `createBaselineExceptionEnvelope()`.
The coordinator returns that structured failure, so the F3AR harness marks its
promise as completed. This does not mean baseline succeeded: baseline
completion remains false because the exception interrupted it.

## Provenance result

No preserved artifact maps script 157 to a URL, generated file, bundle, or
original source. No preserved message identifies the undefined symbol. The
available evidence therefore cannot distinguish an undeclared identifier,
module initialization issue, generated-code reference, or another
`ReferenceError` class.

The inspector event and the baseline envelope are temporally consistent with
the same observer-start failure, but the persisted F3AR output does not contain
the error message, fingerprint payload, or matching stack needed to prove
identity. The relationship is therefore `UNPROVEN`, not a new root-cause
classification.

## Inspector and historical interpretation

The F3AR harness registered its `Debugger.paused` listener before enabling the
debugger and invoking the coordinator. The two superfluous F3AL microtask
boundaries were absent. Their removal was therefore not sufficient to prevent
the observed error, but this does not prove that every possible inspector
effect is non-causal.

No runtime or harness fix was applied in F3AS. The runtime freeze remains
valid. The historical F3AE/F3AG/F3AL classifications are preserved unchanged.
