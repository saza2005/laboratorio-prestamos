# FLOW-L1 R2 - Corrected fixture and lab-staff browser rehearsal

## Result

`L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_DELIVERY_FORM`

The single authorized run used one lab-staff browser and the corrected stage order:

`BROWSER_READY -> create -> CREATED PASS -> approve -> FIXTURE_READY PASS`

The exact request detail opened, but the expected `DeliverForm` surface was not found. Consequently:

- initial delivery clicks: `0`
- `Entregar` clicks: `0`
- delivery Server Action/RPC: `0`
- loans: `0`
- stock and movement deltas: `0`
- exact fixture cleanup: `1`

The runner waited for `ACTION_ARMED` after the child Playwright process had already failed, then timed out. Its fail-path cleanup executed once and only against the captured fixture IDs.

## Safety and postflight

Created and approval writes were the only fixture preparation writes. No delivery business write occurred. Post-cleanup verifier, baseline, storageState, clean-state, and L1 PRE all passed; hashes matched, residual mutating was `0`, and `STATE=CLEAN`.

This does not close the browser rehearsal. The first rehearsal remains preserved as `FAIL_BEFORE_DELIVERY_DIALOG`, F1 remains CLOSED, and R2 is `FAIL_BEFORE_DELIVERY_FORM`. No retry or hotfix was performed.

## F2 disposition

F2 proved from the preserved screenshot and source that the form was rendered. R2 failed because its locator strategy incorrectly combined a form locator with a dialog-anchored `has` locator. F2 corrected only the test helper and coordinator failure propagation. R2 remains historically `FAIL_BEFORE_DELIVERY_FORM`.

R3 is a separate historical result: the corrected form locator succeeded, but the quantity control locator failed before the initial delivery click. R2 remains unchanged.
