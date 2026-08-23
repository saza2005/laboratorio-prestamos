# FLOW-R2 - bwrap runtime diagnostic

## Failure evidence
The original reject launch returned `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted` before Playwright started. Reject confirm count and business RPC were zero.

## bwrap owner
No repository reference to bwrap, bubblewrap, unshare or network namespace was found in the inspected launcher/configuration. The error is external to the repository.

## Successful runtime comparison
The known READ_ONLY launcher passed the admin smoke. The MUTATING-path runtime smoke also passed after adding an explicit non-business diagnostic mode.

## Mutating launcher
The diagnostic mode selects only `runner-runtime-smoke.spec.ts`, Chromium admin, no dependencies, retries zero and no active flow/state preparation.

## READ_ONLY smoke
The smoke navigated to `/dashboard/solicitudes` and verified the authenticated search control. No submit, action, RPC or write was reachable.

## MUTATING-path smoke
The same smoke passed through the MUTATING launcher. Next, Playwright, Chromium and navigation started successfully.

## Root cause
Classification C/D: external sandbox/runtime failure, transient in the failed invocation. It is not a Playwright or repository bwrap configuration issue.

## Correction
No sandbox security was disabled. Only a local diagnostic launcher mode was added.

## Security
No seed, reject, cleanup, business RPC or remote write occurred in this phase. R1/R2 dry-runs remained valid.

## Conclusion
The MUTATING launcher runtime is validated by the READ_ONLY smoke. The original failure should not be fixed by disabling sandbox protections.
