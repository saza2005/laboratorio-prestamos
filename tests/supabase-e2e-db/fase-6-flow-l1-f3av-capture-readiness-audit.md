# F3AV - Capture readiness audit

F3AV was audit-only. No target, coordinator, or inspector session was
executed.

The F3AU capture subset is sufficient for the primary throw-provenance
question when the paused event supplies its description and call frames. The
baseline message and stack remain useful only for secondary correlation. They
are not required to identify the throw site, identifier, top frame, or call
path from the paused event.

The frozen baseline file is `scripts/e2e/verify-baseline.mjs`; changing its
envelope to retain raw error detail would violate the current freeze. A future
harness could add the already exposed coordinator classification to its local
artifact for structural correlation without changing that runtime file.

The passive script map is installed before debugger enable and coordinator
invocation. This gives low race risk, but the repository does not contain a
persisted protocol trace proving the exact `scriptParsed` delivery ordering;
no synchronization should be added to resolve that uncertainty.

Current readiness: suitable for one future forensic capture execution,
conditional on observing a populated description, frames, and script mapping.
F3AU remains historically `INCOMPLETE` because baseline raw detail was not
captured.
