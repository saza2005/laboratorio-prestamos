# FLOW-L1 - Delivery design and preparation

## Canonical definition

The current entrypoint inventory and current application agree that L1 is delivery of an approved request. L2 is the separate direct-loan flow at `/prestamos`; it is not a delivery flow.

`FLOW_L1_DEFINITION_CONFLICT=no`

Canonical chain:

`/dashboard/solicitudes -> RequestActionsPanel -> DeliverForm -> deliverRequestWithState -> persistDeliverRequest -> deliver_approved_request_with_units`

The application uses the five-argument overload:

`deliver_approved_request_with_units(p_request_id, p_units, p_items, p_delivered_by, p_notes)`

The legacy four-argument overload remains in the schema history but is revoked from authenticated execution and is not reachable from the current application. The harness must select the five-argument overload explicitly.

## Actor and UI

The least-privileged canonical actor is `lab_staff`, using Playwright project `chromium-lab-staff` and storage state `lab-staff.json`. The page guard and Server Action accept `admin` and `lab_staff`; the RPC additionally requires the authenticated profile role to be one of those roles and requires `p_delivered_by = auth.uid()`.

The route is `/dashboard/solicitudes`. A staff member selects the exact approved request row, opens its detail drawer, and sees `DeliverForm`. For the minimal full bulk delivery, the initial control is `Confirmar entrega y crear préstamo`. Its confirmation dialog is `Confirmar entrega` and its real confirmation control is `Entregar`. The form fields are `request_id`, `delivery_item_id`, `delivery_item_item_id`, `delivery_item_quantity`, optional `delivery_unit`, and `delivery_notes`.

There is no separate delivery seed in this preparation. A future L1 fixture must be a dedicated individual request created and approved before the delivery action.

## RPC contract and preconditions

The active RPC is `SECURITY DEFINER`, `search_path=public, pg_temp`, returns `uuid`, and runs atomically as one PL/pgSQL transaction. It validates authenticated identity, `p_delivered_by`, staff role, request existence, `approved` status, active item, positive delivery quantity, sufficient stock, and tracked-unit availability when applicable.

Bulk delivery uses `p_units=[]` and one `p_items` entry with the exact request item ID, item ID, and quantity. Tracked delivery requires exactly one available good unit per delivered quantity. Group requests are supported by the current function, but the canonical first fixture is individual bulk because it has the smallest relational and inventory footprint. Partial delivery is supported by the current migration, although the minimal fixture uses full quantity one.

## Expected L1 delta

For one approved individual request with one bulk item and quantity one:

- `requests`: one UPDATE, status `approved -> delivered`.
- `request_items`: one UPDATE, `quantity_delivered 0 -> 1`.
- `loans`: one INSERT, status `active`, `user_id` is the requester, `delivered_by` is the staff actor, due date comes from the request.
- `loan_items`: one INSERT with `item_unit_id=null`, quantity one.
- `items`: one UPDATE, `stock_available -= 1`.
- `inventory_movements`: one INSERT, `movement_type=loan_out`, quantity one, reference to the new loan.
- `loan_groups`, `loan_group_items`, `item_units`, returns, maintenance, and unrelated business tables: zero.

The absolute stock value is read from the dedicated fixture PRE snapshot; the expected delta is exactly `-1`. No baseline request or baseline item may be used as the L1 business fixture.

## Historical Batch C forensic

The historical C1 operation used the correct active five-argument shape and bulk payload, but the prior script authenticated `e2e_teacher` while sending the `e2e_lab_staff` profile ID as `p_delivered_by`. The RPC contract explicitly rejects that mismatch. The preserved artifact contains only the sanitized wrapper classification `loan_delivery_failed_E2E_LOAN_ACTIVE`, so the raw Postgres response cannot be independently recovered. The strongest supported classification is `RPC_VALIDATION` with `AUTH_UID_DELIVERED_BY_MISMATCH`; the historical post-check confirmed no loan, no movement, no stock/unit change, and no partial persistence.

This is historical evidence only. The RPC was not executed in this phase.

## Fixture and accounting plan

Namespaces:

`E2E_MUT_REQ_L1_` for the request and `E2E_MUT_LOAN_L1_` for the resulting loan notes.

The future prerequisite plan is:

1. Create a dedicated individual request as the controlled student with one bulk item and quantity one.
2. Approve that request through the canonical approval path as lab staff.
3. Stop and verify the exact approved fixture.
4. Run L1 delivery as lab staff through the browser.

Prerequisite request-create and approval RPC counts are tracked separately from the L1 delivery RPC count. No prerequisite operation was executed here. Existing approved baseline requests are not safe to mutate.

## Restoration and recovery

Cleanup is not a simple delete. It must restore the exact PRE item stock, tracked-unit states if the fixture class changes, request status and delivered quantities, and exact inventory movement set before deleting the captured loan graph and request graph. The planned exact order is:

`restore request/item and inventory values -> inventory_movements -> loan_group_items -> loan_groups -> loan_items -> loans -> request_items -> requests`

Only captured IDs are allowed. The return RPC is never used as L1 cleanup. Ambiguous completion must classify DB state and either recover exact IDs or fail closed; no delivery retry is permitted.

## Readiness

The existing R4 sanitized POST classifier, completion coordinator, clean-state reliability verifier, handshake, lifecycle, and ACTION_DONE DB gate are reusable for L1. The L1 risk is `HIGH_MUTATION` because one action couples request state, loan graph, stock, and inventory movements. Browser readiness is the protected `/dashboard/solicitudes` surface with the canonical requests table and exact approved request detail; no browser was run in this phase.

`L1_DESIGN_AND_PREPARATION_STATUS=CLOSED`

This document does not authorize fixture creation, approval, delivery, cleanup, or mutating Playwright.

## FASE 6.3B boundary

The authorized fixture/browser rehearsal created and approved its dedicated fixture once, then performed one exact-ID fixture cleanup. It stopped before the delivery control because the `created` verifier rejected the observed intermediate request status. No delivery action or delivery RPC was attempted. Baseline and postflight were restored to CLEAN. The preparation contract remains CLOSED; the browser rehearsal remains OPEN pending READ_ONLY status-contract forensic work.

## Gate result

The local suite and the final remote READ_ONLY preflight passed. L1 PRE verifier found zero dedicated request/loan namespace residuals; baseline, storageState, and clean-state passed with matching storage hashes, residual mutating zero, and `STATE=CLEAN`. Browser runs, fixture writes, delivery/loan RPCs, and cleanup executions remained zero.
