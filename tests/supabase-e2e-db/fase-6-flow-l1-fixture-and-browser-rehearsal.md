# FLOW-L1 - Dedicated fixture and browser rehearsal

## Authorization

FASE 6.3B authorized one `chromium-lab-staff` run with at most one dedicated request creation, one approval, one initial delivery click, zero final delivery clicks, zero delivery RPC executions, and one exact fixture cleanup. No retry was used.

## Observed result

- Browser run: `1`.
- Dedicated request creation: `1` RPC, confirmed.
- Dedicated approval: `1` RPC, confirmed.
- Initial delivery click: `0`.
- Final `Entregar` click: `0`.
- Delivery Server Action/RPC: `0`.
- Loan, stock, and inventory movement mutation: `0`.
- Exact fixture cleanup: `1`.

The run stopped at the created-fixture verifier with `CATEGORY=request_signature`, before the fixture-ready browser phase. The runner's exact cleanup guard removed the approved fixture without a delivery-restoration branch.

## Safety outcome

Post-cleanup verification passed. Baseline, storageState, clean-state, and L1 PRE postflight passed; storage hashes matched, residual mutating was `0`, and `STATE=CLEAN`. No delivery POST reached the application and no delivery business completion was published.

The phase is intentionally not marked closed:

`L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_DELIVERY_DIALOG`

The failure requires READ_ONLY forensic work on the created-state status contract and runner sequencing. There is no authorization for another fixture creation, approval, cleanup, browser run, or delivery attempt in this phase.

## F1 forensic disposition

The failed run did not preserve a separate CREATED snapshot. The durable snapshot was written after creation and then after approval. The runtime handshake artifact preserved only `BROWSER_READY`; it did not contain a complete event log. The source timeline is authoritative: the combined preparation script executed approval before the runner's CREATED verifier.

The local harness has been corrected to separate create and approval stages. The corrected ordering is covered by synthetic gate tests; no remote operation was used to validate the fix.

## R2 result

R2 confirmed the corrected fixture gate at runtime:

`create -> CREATED PASS -> approve -> FIXTURE_READY PASS`

The browser did not reach `DeliverForm`. The exact detail dialog was found, but the expected delivery form/button surface was absent, so the test failed before the initial delivery click. The runner later timed out waiting for `ACTION_ARMED` even though Playwright had already exited; its exact failure cleanup removed the approved fixture.

Observed mutation accounting remained fixture-only: one create, one approval, one exact cleanup, zero delivery operations. Postflight was CLEAN. The historical first rehearsal remains `FAIL_BEFORE_DELIVERY_DIALOG`; R2 is `FAIL_BEFORE_DELIVERY_FORM`.

F2 classified the UI failure as a harness locator defect, confirmed the form render contract, and added pre-arm coordinator failure handling. No remote operation was performed.

R3 reached the corrected `DeliverForm`, then failed at the quantity locator before the initial delivery click. The visible label is not associated with the numeric input, so the semantic accessible-name locator was not reachable. Fixture cleanup and postflight remained clean.
