# F3AT - ReferenceError capture gap audit

F3AT was audit/design-only. No target, coordinator, inspector session, or
remote operation was executed.

## Proven capture pipeline

The existing F3AO listener receives `Debugger.paused`, checks
`event.params.data.className`, reads `event.params.callFrames`, and stores only
the first frame location (`scriptId`, line, column), a coarse script class,
and a frame-count boolean. It then resumes execution. The final stdout report
serializes only those coarse fields. There is no persisted raw event, no
`Debugger.scriptParsed` map, and no detailed provenance artifact.

The primary loss point is listener extraction/report projection, not the V8
event. `callFrames` are available to the listener and no additional inspector
operation is required to preserve them structurally. The listener simply does
not retain them. The message is likewise not read from the paused payload.

## Baseline correlation

`runBaselineCore()` catches the original error and constructs
`createBaselineExceptionEnvelope()`. The envelope records a safe structural
fingerprint only. `safeErrorFingerprint()` intentionally excludes the raw
message and stack from its output. Thus the baseline failure is temporally
consistent with the paused `ReferenceError`, but the existing artifacts cannot
prove object/message/stack identity.

## Minimum future capture design

In the forensic harness only, retain a sanitized throw record containing the
paused reason, safe exception class/description, all structural call frames,
and any async stack metadata already present in the event. Register a passive
`Debugger.scriptParsed` listener after `Debugger.enable` to retain a sanitized
`scriptId -> URL-class/repository-relative-path` map. This requires no new
await, promise, timer, event-loop turn, target-facing import, or protocol call.

The raw local artifact and sanitized report must remain separate. Secret-bearing
values, scope data, evaluated expressions, headers, bodies, credentials, and
external absolute paths remain excluded. `Debugger.getScriptSource` is
optional later and is not required for the first provenance capture.

No runtime or current harness change was applied in F3AT. A future capture
phase would require a separate authorization and must preserve the existing
environment loading, project isolation, normalized inspector setup, and zero
remote operations.
