# FLOW-R3 — Fixture seed review

## Scope

READ_ONLY/local review only. No R3 seed, approval, cleanup, business RPC, or remote write was executed.

## Seed contract

The dedicated seed is `scripts/e2e/seed-mutating-r3.mjs`. Its default mode is dry-run. The future execute path requires `--confirm-e2e`, `--flow=FLOW-R3`, `--execute`, and `E2E_MUTATING_CONFIRM=FLOW-R3-SEED`; a non-clean local state rejects the attempt through `registerFlow` before the RPC call.

The future seed authenticates as student, selects the deterministic `E2E_ITEM_BULK` record from local canonical test data, verifies the item is active with stock at least `1`, and calls `create_request_transaction` exactly once with one individual item and an empty groups array.

Expected remote footprint:

- `requests` INSERT: 1
- `request_items` INSERT: 1
- all other INSERT/UPDATE/DELETE operations: 0
- inventory, units, movements, loans, returns, and maintenance effects: 0

## Tracking and verification

The state uses `remote_write_confirmed`, exact request ID tracking, `cleanup_required`, and the R3 namespace. `seed_write_confirmed` is absent. The seeded verifier requires the exact pending individual request, one bulk request item with requested quantity `1` and approved quantity `0`, student ownership, no groups/loans/returns, and zero inventory delta.

## Approval payload and delta

The future approval payload contains one request item with approved quantity `1`. The delta verifier expects one request UPDATE and one request_item UPDATE relative to seeded state, status `pending -> approved`, reviewer metadata, and no other writes or side effects.

## Cleanup and recovery

Cleanup uses the exact tracked request and request_item IDs, in child-first order. It accepts both pending seeded state and approved post-action state, rejects groups/loans, and cannot target baseline rows. A failed or ambiguous seed cannot be retried automatically; state must be classified/read and remain fail-closed.

## Validation results

- R3 seed contract test: PASS
- R3 state gate tests: PASS
- R3 verifier contract test: PASS
- R3 cleanup exactness test: PASS
- seed dry-run: PASS, remote writes `0`
- cleanup dry-run: PASS, targets `0`
- verifier pre: PASS
- runner dry-run: PASS
- baseline/storage/clean-state postflight: PASS, hashes MATCH, residuals `0`

## Status

`R3_FIXTURE_SEED_REVIEW_STATUS=CLOSED`

`FLOW_R3_OFFICIAL_STATUS=OPEN`

Next safe step: explicit authorization for exactly one browser-first R3 real seed execution. Approval and cleanup remain unauthorized in this phase.
