# FLOW-L1 - CREATED signature and gate-ordering forensic

## Evidence

The failed run preserved the durable L1 snapshot, the final handshake artifact, source runner/fixture scripts, cleanup evidence, and postflight results. It did not preserve a separate pre-approval CREATED snapshot or a complete runtime event log. Exact identifiers remain local state and are not reproduced here.

## Actual ordering

The source execution order was:

`BROWSER_READY -> prepare(create + approve) -> CREATED verifier -> FIXTURE_READY verifier`

The approval RPC was therefore executed before `CREATED` verification. `L1_FIXTURE_CREATED_VERIFIER=FAIL(request_signature)` was observed after approval, not before it. Approval-after-created-failure reachability was consequently not exercised by the failed run; the old combined preparation contract made the gate ineffective.

## Signature finding

The verifier's CREATED contract expected a pending request with requested quantity one, approved and delivered quantities zero, the controlled student owner and item, no reviewer, no loan, and unchanged stock/movements. The fixture creation RPC is designed to produce that pending state. The preserved artifact lacks a separate CREATED read, so no field-level runtime mismatch can be proven from the old run alone. The demonstrated root cause is `STAGE_ORDERING_DEFECT` with high confidence.

The approved fixture was later accepted by the exact cleanup signature, and post-cleanup verification restored request, loan, stock, movement, and unit state. This supports cleanup safety but does not retroactively prove a separate CREATED snapshot.

## Local correction

`prepare-l1-fixture.mjs` now requires an explicit `--stage=create` or `--stage=approve`. The runner performs:

`create -> CREATED verifier PASS -> approve -> FIXTURE_READY verifier`

Approval is unreachable after a CREATED failure. Synthetic tests cover the valid CREATED signature, wrong owner/status/item/quantities, reviewer/loan/stock/movement deltas, approval gating, FIXTURE_READY separation, cleanup, and historical teacher/lab_staff identity mismatch.

No application/business code, RPC, schema, auth, RLS, or normal Supabase project was changed. No remote mutation was executed in F1.

`L1_CREATED_SIGNATURE_FORENSIC_STATUS=CLOSED`

`L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_DELIVERY_DIALOG`

## R2 follow-up

R2 validated the local stage-order correction remotely without reaching delivery: CREATED passed before approval and FIXTURE_READY passed after approval. The remaining blocker is UI-surface resolution in the exact request detail, followed by a coordinator issue where a failed child is not observed promptly by `waitForState`. Neither issue was hotfixed during the authorized run.
