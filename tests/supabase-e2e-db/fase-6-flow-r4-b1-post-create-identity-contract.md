# FLOW-R4-B1 - Post-create exact identity contract

## Scope

This was a LOCAL + READ_ONLY forensic phase. It did not start Playwright, create a grouped request, invoke a business RPC, execute cleanup, or write remote data.

## Finding

R4-B correctly stopped because `RequestFormGroups` has no editable `group_name`. That remains a UI contract limitation. It is not necessary to use `group_name` as the primary identity, however: the canonical form persists editable `purpose`, so the harness can record a unique run marker before the future write.

## Identity model

Before the future `ACTION_GO`, the harness persists a mode-600 PRE snapshot containing the controlled teacher's request IDs and related child IDs. The tracking record also contains the run identifier, teacher/student/item aliases, expected signature, and creation attempt count `0`.

After the correlated Server Action, recovery reads the teacher request set and computes `POST minus PRE`:

- zero candidates: `NO_NEW_REQUEST`, fail closed;
- one candidate: validate the complete grouped relational signature;
- more than one candidate: `MULTIPLE_NEW_REQUESTS`, fail closed.

The signature requires the controlled teacher, the exact run `purpose`, pending status, null approval metadata, one request item, one request group, one group item, `Grupo 1`, the controlled E2E student leader, the controlled E2E bulk item, and quantity `1` with approved quantity `0`. Partial child rows and mismatches fail closed. Timestamp is never primary identity.

On success, exact request, request item, group, and group-item IDs are persisted locally for verifier and cleanup. Cleanup is exact-ID-only and does not depend on group name, status-wide selection, teacher-wide deletion, or latest/first/last selection. The PRE request set must be restored exactly after cleanup.

## Evidence

- Local TypeScript, Node checks, directed ESLint, R4 contract, identity, cleanup, tracking, classifier, completion, handshake, lifecycle, ACTION_DONE, and clean-state reliability tests: PASS.
- Fail-closed simulations: zero candidate, multiple candidates, signature mismatch, partial relational create, missing IDs, ambiguous recovery, exact ID capture, and PRE restoration: PASS.
- Remote PRE snapshot capture: PASS; one request in the controlled teacher scope; remote writes `0`.
- Standard READ_ONLY preflight: baseline PASS, storageState PASS, clean-state PASS, R4 PRE PASS, hashes MATCH, residual mutating `0`, state CLEAN.
- Browser runs: `0`.
- Business RPC executions: `0`.
- Cleanup executions: `0`.

## Decision

`R4_EXACT_IDENTIFICATION_WITHOUT_UI_CHANGE=yes`

`R4_UI_BUSINESS_CHANGE_REQUIRED=no`

`R4_POST_CREATE_IDENTITY_CONTRACT_STATUS=CLOSED`

The historical R4-B browser result remains `BLOCKED_BY_UI_CONTRACT`. The next step requires explicit authorization for a new browser rehearsal using this revised identity contract. It does not authorize grouped-request creation.
