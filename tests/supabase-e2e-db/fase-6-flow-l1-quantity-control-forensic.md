# FLOW-L1 F3 - Quantity control locator and accessibility forensic

## F3F status dependency

The quantity locator fix remains locally valid. Its forensic status remains OPEN because the separate L1 PRE reliability path has not yet reached a final complete preflight. The historical R3 result remains `FAIL_BEFORE_INITIAL_DELIVERY_CLICK`.

## F3E note

The quantity locator conclusion is unchanged and locally validated. No browser or mutation was authorized.

## F3D result

The quantity locator remains locally solved. The canonical L1 PRE request read still fails with a structured Supabase result error; no browser or mutation was authorized.

## F3C note

The complete L1 PRE discrepancy is now observable at the Supabase result boundary. The quantity locator remains locally solved; no browser or mutation was authorized.

## Current source contract

The quantity control is implemented in `app/dashboard/solicitudes/request-actions-panel.tsx`, component `DeliverForm`, in the bulk branch of the requirements map.

```text
label text: Cantidad a entregar
input type: number
min: 0
max: computed maxDeliverable
value: controlled React quantity state
step: absent
name: absent
id: absent
aria-label: absent
aria-labelledby: absent
```

The visible label has no `htmlFor`; the input has no matching `id`, is not wrapped by the label, and has no ARIA naming attribute. Its accessible name is absent under the current DOM contract. This is an application accessibility gap, while the functional quantity behavior remains valid.

The numeric input is not the submitted field. `persistDeliverRequest` reads hidden `delivery_item_quantity` entries, parses non-negative integers, and builds the RPC item payload. For approved quantity `1`, delivered quantity `0`, and sufficient bulk stock, delivering `1` is valid.

## R3 failure

The failing locator was `deliveryForm.getByRole('spinbutton', { name: 'Cantidad a entregar', exact: true })` in the L1 rehearsal spec.

```text
L1_R3_QUANTITY_LOCATOR_ROOT_CAUSE=ACCESSIBLE_NAME_NOT_PRESENT
L1_R3_QUANTITY_LOCATOR_ROOT_CAUSE_CONFIDENCE=HIGH
L1_APPLICATION_FUNCTIONAL_QUANTITY_BUG_DEMONSTRATED=no
L1_APPLICATION_QUANTITY_ACCESSIBILITY_GAP_DEMONSTRATED=yes
```

## Corrected local helper

The helper now resolves `exact DeliverForm -> exact item card containing the canonical item code -> exactly one input[type="number"]`. It uses no `first()`, `last()`, `nth()`, global selector, or text proximity alone. The one-item fixture is deterministic; item-card scoping is required because the component supports multiple item quantities.

The application label association remains unchanged and must not be reported as fixed by the harness.

## Validation and status

Local positive, missing, ambiguous, wrong-type, multi-item, value-1, no-submit, delivery-surface, dialog, coordinator, cleanup, auth, and R1-R4 regression tests passed. TypeScript, Node checks, targeted ESLint, and zero-write dry-runs passed. Global ESLint retains pre-existing generated Supabase/runtime failures; targeted files pass.

The one authorized remote read-only preflight had baseline, storageState, and clean-state PASS, but the L1 PRE verifier returned `l1_pre_read_failed`. It was not retried. No browser, fixture mutation, delivery, cleanup, or remote write occurred in F3.

F3A added sanitized per-read diagnostics and reused the existing bounded read-only reliability helper. The targeted probe failed closed on `L1_PRE_REQUESTS` with `UNKNOWN_REMOTE_READ_ERROR` on attempt `1`; no complete preflight was run afterwards. The quantity locator remains locally solved, but this forensic gate remains open.

F3B verified the classifier cause-chain and safe-fingerprint behavior. Narrow `requests` and `loans` probes passed, but the complete L1 PRE verifier again received an empty error object on `L1_PRE_REQUESTS`; the native cause remains unproven. No retry-class broadening or mutating action was performed.

```text
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_INITIAL_DELIVERY_CLICK
FLOW_L1_OFFICIAL_STATUS=OPEN
BASELINE_RESTORED=yes
STATE=CLEAN
```
