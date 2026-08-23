# FLOW-R3 REAL ATTEMPT 1

## Result

This was the single explicitly authorized real attempt. It used one browser-first run, one R3 seed, zero approval executions, and one exact cleanup. No retry was performed.

## Preflight and safety

- Port `3000`: free before and after runtime.
- No pre-existing Playwright, Chromium, or E2E runner processes.
- Baseline, storageState, and clean-state preflight: PASS; hashes MATCH; residual mutating `0`.
- Local TypeScript, Node, directed ESLint, classifier replay/negative tests, completion, handshake, lifecycle, state, seed, verifier, and cleanup tests: PASS.
- Approval email target: controlled E2E test recipient class. No recipient address was logged.
- Classifier remained frozen; no classifier, business code, RPC, RLS, seed, or cleanup change occurred during runtime.

## Runtime

- `BROWSER_READY=1`; seed occurred after readiness.
- Seed execution/RPC: `1/1`; expected fixture insert footprint; seeded verifier and `FIXTURE_READY`: PASS.
- Same Chromium and canonical admin state were used.
- Detail and pending/individual fixture UI loaded.
- The failure occurred while resolving the initial Approve control in the real branch. The helper's form scope matched both the initial submit and the dialog confirmation button, causing Playwright strict-mode failure.

## Business safety

- Initial client-side click: `1`; it opened the confirmation dialog without a Server Action.
- Final confirmation click: `0`.
- Approval Server Action: `0`.
- Approval RPC and request/request_item approval updates: `0`.
- Business DB result: `NOT_EXECUTED_OR_BLOCKED`.
- No approval state transition occurred.

## Cleanup and postflight

- Exact cleanup: `1`, `request_items -> requests`.
- Post-cleanup verifier: PASS.
- Baseline/storageState/clean-state: PASS.
- Hashes: MATCH; residual mutating `0`; state CLEAN.
- Playwright/Chromium/orphan processes: `0`; port `3000` free.

## Status

`FLOW_R3_REAL_ATTEMPT_1_STATUS=FAIL_BEFORE_APPROVAL`

`FLOW_R3_OFFICIAL_STATUS=OPEN`

## Subsequent REAL-2 execution

REAL-1 remains historical and unchanged: it failed before `ACTION_ARMED` with no approval. A separate authorization later completed REAL-2 successfully; details are recorded in `fase-6-flow-r3-real-attempt-2.md`. No REAL-1 result is rewritten.

No attempt #2 is authorized. The next action is READ_ONLY forensic/harness review of the strict locator failure.

## REAL-1A forensic closure

The failure was demonstrated as a harness-only lazy-locator re-evaluation defect. The initial locator was unique before the initial click, but REAL-1 later called `elementHandle()` on that lazy locator after the confirmation dialog was open. The form scope then contained both the initial submit and the dialog confirm, producing the documented strict-mode count `2`.

The helper now captures the initial element handle before clicking and returns it for the post-dialog identity check. The final confirm remains scoped to the named approval dialog. No positional selectors were added. Local positive and fail-closed negative tests pass; application/business code, classifier, completion, DB classification, seed, and cleanup behavior are unchanged.

`R3_REAL1_LOCATOR_FORENSIC_STATUS=CLOSED`

REAL-1 remains `FAIL_BEFORE_APPROVAL`; no runtime rerun is authorized by this phase.
