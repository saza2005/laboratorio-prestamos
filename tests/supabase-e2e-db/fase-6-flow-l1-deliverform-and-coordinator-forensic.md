# FLOW-L1 - DeliverForm and coordinator forensic

## F3 quantity follow-up

The quantity markup has visible label text but no `htmlFor`/`id` association and no ARIA naming attribute. This is an application accessibility gap, not a functional quantity-processing defect. The local selector is now `exact DeliverForm -> exact item card containing the canonical item code -> exactly one input[type="number"]`; application code was not changed.

## Evidence

R2 preserved a screenshot showing the approved request detail with `Registrar entrega`, quantity `1`, available stock, delivery notes, and the delivery form. No DOM snapshot, console log, locator diagnostic, or complete coordinator event log was preserved. The handshake artifact only preserved the last runtime state.

## Actual UI contract

The current render tree is:

`/dashboard/solicitudes -> RequestsTable -> DetailDrawer(role=dialog, aria-label=Detalle) -> selectedRequest.actions -> RequestActionsPanel -> DeliverForm`

`RequestActionsPanel` renders `DeliverForm` when `request.status === 'approved'`. The page permits `admin` and `lab_staff` through `canManageLoans`; the dedicated R2 fixture satisfied approved status, one approved quantity, zero delivered quantity, active bulk item, and sufficient stock.

`DeliverForm` is a real current component, conditionally mounted by approved status. There is no intermediate tab, accordion, or action click. The initial control is a submit button inside that form; the confirmation dialog is opened only after that initial click.

## R2 root cause

The failing locator was:

`detail.locator('form').filter({ has: detail.getByRole('button', { name: 'Confirmar entrega y crear préstamo', exact: true }) })`

The form was present, but the `has` locator was anchored to the ancestor dialog rather than resolved relative to each candidate form. Classification:

`L1_DELIVER_FORM_ROOT_CAUSE=WRONG_LOCATOR`

`L1_DELIVER_FORM_ROOT_CAUSE_CONFIDENCE=HIGH`

`L1_APPLICATION_UI_BUG_DEMONSTRATED=no`

`L1_HARNESS_UI_CONTRACT_DEFECT_DEMONSTRATED=yes`

The local helper now resolves the unique form within the detail dialog and then resolves the exact initial button within that form. No positional locator was added.

## Coordinator root cause

After the child failed before `ACTION_ARMED`, `run-flow-l1-b.mjs` continued polling `waitForState('ACTION_ARMED')` without checking child termination. Classification:

`L1_COORDINATOR_TIMEOUT_ROOT_CAUSE=WAIT_CONDITION_NOT_RACED_WITH_FAILURE`

`L1_COORDINATOR_TIMEOUT_ROOT_CAUSE_CONFIDENCE=HIGH`

The local coordinator now rejects immediately when the child exits before the awaited milestone. It publishes no `ACTION_ARMED`, `ACTION_GO`, `ACTION_RUNNING`, or `ACTION_DONE` state and preserves the exact cleanup gate.

## Validation and status

UI render/negative tests, coordinator failure tests, R1-R4 regressions, dry-runs, and remote READ_ONLY preflight passed. No browser, fixture write, delivery, or cleanup was executed in F2.

`L1_DELIVERFORM_COORDINATOR_FORENSIC_STATUS=CLOSED`

`L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_DELIVERY_FORM`

## R3 follow-up

R3 confirmed that the corrected form locator reaches the real `DeliverForm`. The next locator, based on the accessible name `Cantidad a entregar`, resolved zero because the current numeric input is not associated with that visible label. This is a harness/UI accessibility-contract blocker, not evidence of a delivery business failure. R3 stopped before any delivery click and restored CLEAN.
