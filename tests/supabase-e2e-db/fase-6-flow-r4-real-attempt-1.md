# FLOW-R4 REAL-1 - First grouped-request creation

## Authorization and preflight

This was the first explicit mutation authorization for the repository-defined R4 operation: teacher-created grouped request creation on `/solicitudes/grupal`, using `chromium-teacher`. No prerequisite seed was used. The authorization allowed at most one browser, one submit, one grouped-create Server Action, one `create_request_transaction` call, and one exact cleanup. No retry was performed.

All R4 helper, identity, verifier, cleanup, tracking, classifier, completion, ACTION_DONE, clean-state, and business-code contracts were frozen before runtime. Local TypeScript, Node checks, directed ESLint, R4 contract/identity/cleanup/tracking/completion/handshake/lifecycle/ACTION_DONE tests, clean-state diagnostics, and R1/R2/R3 read-only regressions passed. Global ESLint was reported separately as the existing baseline.

The durable PRE snapshot was captured before browser startup with attempt count zero, a unique safe purpose marker, the teacher request and child sets, reference aliases, expected signature, forbidden-table snapshots, and tracking state. Marker collision was zero and the PRE verifier passed. Fresh baseline, storageState, clean-state, and R4 PRE checks passed; transient recovery, non-transient failures, and unknown failures were zero. Hashes matched and residual mutating state was zero.

## Browser and action

One teacher Chromium instance reached `BROWSER_READY` on `/solicitudes/grupal`. The canonical grouped form was prepared with the exact student and item references, canonical `Grupo 1`, quantity one, and a valid minimal grouped payload. The submit control was unique, visible, and enabled.

`ACTION_ARMED=1` and `ACTION_GO=1` were published once. The submit was clicked exactly once. The frozen R4-C contract matched one same-origin grouped-create Server Action with `Next-Action` present; it was the only Server Action allowed to reach Next. No second Server Action, unknown POST, or unexpected application POST occurred. The response was redirect-compatible 3xx with `response.ok=false`; no response-ok assertion fired. The framework diagnostic count was zero in this run.

## Business classification

The mandatory DB classification completed once. PRE-to-POST set difference produced exactly one candidate. Its purpose and full relational signature matched the expected teacher/group/pending/one-item/one-group/one-group-item contract. The exact write footprint was:

- `requests` INSERT: 1
- `request_items` INSERT: 1
- `request_groups` INSERT: 1
- `request_group_items` INSERT: 1
- updates/deletes/other business writes: 0
- item, item-unit, inventory movement, loan, return, and audit mutations: 0
- `create_request_transaction`: 1

The exact request and child IDs were captured locally and are intentionally omitted here and from the final report.

`BUSINESS_DB_RESULT=PASS`

`BUSINESS_FLOW_R4_VALIDATED=yes`

## Cleanup and restoration

Cleanup executed exactly once using captured IDs in schema-safe order: `request_group_items -> request_groups -> request_items -> requests`. No broad, latest, first, last, status-only, or teacher-wide deletion was used.

The post-cleanup verifier passed with zero captured residuals. The teacher request set and all relevant child sets matched the durable PRE snapshot. Final baseline, storageState, clean-state, and R4 post-cleanup verification passed with matching hashes, residual mutating zero, and `STATE=CLEAN`. Playwright passed, `ACTION_RUNNING=1`, `ACTION_DONE=1`, and false-positive ACTION_DONE reachability was zero.

The request-created email hook was nonfatal and did not retry because E2E Resend delivery was disabled by missing credentials. No uncontrolled recipient delivery occurred.

## Final status

`FLOW_R4_REAL_ATTEMPT_1_STATUS=CLOSED`

`PLAYWRIGHT_ORCHESTRATION_R4_VALIDATED=yes`

`FLOW_R4_OFFICIAL_STATUS=CLOSED`

`BASELINE_RESTORED=yes`

No second attempt, R5, L1, staging, commit, migration, reset, truncate, or normal Supabase project modification was performed. Stop and await explicit authorization before the next flow.
