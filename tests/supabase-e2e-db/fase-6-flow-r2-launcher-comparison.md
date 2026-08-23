# FLOW-R2 - Launcher runtime comparison

## Successful runtime
The 6.2C-V UI rehearsal used `run-playwright-readonly.mjs`, Chromium admin, the canonical admin storageState, one worker, no dependencies and the E2E web server. It passed with zero writes.

## Failed runtime
The 6.2D MUTATING command was requested through `run-playwright-mutating.mjs` and failed before Playwright with `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`. No Next, Playwright or Chromium process was created in that attempt.

## Differences
The relevant difference was the launcher invocation and external execution environment. Repository scripts contain no bwrap, bubblewrap or unshare configuration. Browser security was not disabled.

## Classification
The bwrap message belongs to the external sandbox/runtime layer. The repository-only runtime-smoke mode was added to test the launcher without selecting a business flow; it does not bypass sandbox protections.
