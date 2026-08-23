# F3AU - Passive forensic capture fix

F3AU modified only `scripts/e2e/test-flow-l1-f3ao-normalized-inspector.mjs`.
The listener now captures sanitized paused-event description, all structural
call frames, passive `Debugger.scriptParsed` URL classes, and async-stack
metadata when already present. No protocol calls, awaits, timers, retries, or
target-facing imports were added.

The baseline error detail requirement remains incomplete by design: `runBaselineCore()`
is frozen and consumes the original Error into a structural fingerprint before
returning. The forensic harness receives no baseline message or stack to
capture. Modifying that runtime file was prohibited, so no runtime change was
attempted.

No target, coordinator, inspector session, or remote operation was executed.
The F3AD runtime freeze remained valid.
