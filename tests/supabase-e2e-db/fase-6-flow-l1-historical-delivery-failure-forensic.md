# FLOW-L1 - Historical Batch C delivery failure forensic

The Batch C C1 attempt is preserved as historical evidence and is not a FASE 6 L1 execution.

## Sanitized facts

- Operation: approved-request delivery through the active five-argument RPC.
- Request fixture: dedicated approved student request.
- Item class: bulk/consumable.
- Quantity: one.
- Operator profile intended: `e2e_lab_staff`.
- RPC attempts: one.
- Completed operations: zero.
- Post-check: no loan, loan item, movement, request delivery update, stock change, or unit change.

## Failure classification

`HISTORICAL_DELIVERY_FAILURE_LAYER=RPC_VALIDATION`

`HISTORICAL_RPC_CONFIRMED_FAILED=unknown`

`HISTORICAL_RPC_RESPONSE_CLASS=SANITIZED_RPC_ERROR_AUTH_UID_DELIVERED_BY_MISMATCH`

`HISTORICAL_POSTCHECK_FAILURE_PRESENT=yes`

The raw Postgres message was not preserved. The repository forensic record identifies the input identity mismatch: the script session was `e2e_teacher` while `p_delivered_by` represented `e2e_lab_staff`. The current RPC explicitly requires `p_delivered_by = auth.uid()`. Therefore the failure is sufficiently classified for design, but not replayed or retried here.

## Contract comparison

The historical payload shape matched the current active RPC: empty units array and one bulk item payload containing request-item ID, item ID, and quantity one. The historical authentication contract did not match the current RPC identity precondition. The safe correction is actor/session alignment, not a migration, RPC change, or payload workaround.

`HISTORICAL_C1_MATCHES_CURRENT_RPC_CONTRACT=no`

`HISTORICAL_C1_CONTRACT_MISMATCH=authenticated session actor differed from p_delivered_by`

No remote operation was performed while producing this document.

## FASE 6.3B preservation

The current rehearsal did not execute delivery and does not alter the historical Batch C classification. Its lab-staff identity gate and delivery RPC remained unexecuted. The fixture-only create, approval, and exact cleanup are separate FASE 6.3B preparation writes.
