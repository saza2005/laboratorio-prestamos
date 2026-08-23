# FLOW-R3 — Definition, audit and safe preparation

## Canonical definition

The canonical entrypoint matrix defines FLOW-R3 as an approval of an individual request in `6.2 Solicitudes`:

- route: `/dashboard/solicitudes`
- actor: `admin` or `lab_staff`; preparation uses `chromium-admin`
- UI operation: approve request
- Server Action: `approveRequestWithState`
- persistence wrapper: `persistApproveRequest`
- RPC: `approve_request_transaction(uuid, jsonb)`
- risk: `MEDIUM_MUTATION`
- baseline dependency: none; a dedicated pending fixture is required

No conflicting R3 definition was found in the FASE 6 entrypoint matrix, request contracts, UI, Server Action, or migration/RPC sources.

## Business path

`RequestsTable` selects a request, `DetailDrawer` renders `RequestActionsPanel` for a pending request, and `ApproveForm` binds `useActionState(approveRequestWithState)`. The form contains `request_id`, one `request_item_id`, and one `quantity_approved` input for the individual fixture. `useConfirmSubmit` opens the confirmation dialog; the final confirmation submits the form. The action validates `canManageLoans`, request ID, item/quantity cardinality, then calls the approval RPC and redirects to `/dashboard/solicitudes`.

## Gates

### UI render gates

1. authenticated profile exists;
2. profile role passes `canManageLoans`;
3. request is loaded in the dashboard list and selected in the detail drawer;
4. visible request status is `pending`;
5. request is individual for this fixture (`request_groups` is empty);
6. the individual request has its request item and active item data available.

### RPC/business gates

1. authenticated actor is `admin` or `lab_staff`;
2. request exists and is `pending`;
3. payload is a JSON array whose length equals request items;
4. each request item belongs to the request, is unique, and has quantity `0..quantity_requested`;
5. at least one approved quantity is greater than zero;
6. every referenced item is active and aggregate approved quantity does not exceed stock.

## Write footprint

For the dedicated individual one-item fixture with approved quantity `1`:

| Table | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|
| `requests` | 0 | 1 | 0 |
| `request_items` | 0 | 1 | 0 |
| `request_groups` | 0 | 0 | 0 |
| `request_group_items` | 0 | 0 | 0 |
| `items` | 0 | 0 | 0 |
| `item_units` | 0 | 0 | 0 |
| `inventory_movements` | 0 | 0 | 0 |
| `loans` | 0 | 0 | 0 |
| `returns` | 0 | 0 | 0 |
| `maintenance_records` | 0 | 0 | 0 |
| `audit_logs` | 0 | 0 | 0 |

The request update sets `status=approved`, `approved_by`, `approved_at`, and clears `rejection_reason`; the update trigger may also change `updated_at`. No inventory, units, movement, loan, return, or maintenance effects are reachable.

## Side effects and completion

Approval attempts a `request-approved` email after the RPC. Email failures are caught and logged by the application and are non-fatal to the business write. The action redirects to `/dashboard/solicitudes`. R2's reject-specific lifecycle coordinator is not reused directly; R3 needs a behavior-preserving generic completion contract that correlates the Server Action request/response and classifies DB state before `ACTION_DONE`.

## Fixture and seed design

- namespace: `E2E_MUT_REQ_R3_`
- type: individual request
- owner: student
- reviewer: admin
- initial status: pending
- child rows: one `request_items` row, bulk item, requested quantity `1`, approved quantity `0`
- relations: no groups, loans, deliveries, returns, or maintenance
- seed: the existing `create_request_transaction` RPC through a dedicated R3 dry-run/execute-gated script
- expected seed inserts: one request and one request item; no updates or inventory delta

The new scripts use the canonical `remote_write_confirmed` field and exact request IDs. They are separate from R1/R2 business execution paths.

The seed also verifies the selected canonical bulk item is active and has stock at least `1` before its future RPC call. No first/last/available-item fallback is used.

## Tracking and verification

`mutating-state.mjs` now allowlists FLOW-R3 and its namespace without introducing aliases. The R3 gate requires active flow, namespace/marker, request ID, `remote_write_confirmed=true`, `cleanup_required=true`, and the expected owner/reviewer roles.

Stages are implemented as READ_ONLY-capable scripts: `pre`, `seeded`, `delta`, and `post-cleanup`. The delta expects seed counts `+1/+1`, approval action deltas `0/0` relative to seeded, pending-to-approved status, approved metadata, and zero side effects.

## Cleanup and recovery

Cleanup is exact-ID only: delete the one request item, then the one request, after verifying marker, status (`pending` or `approved`), no groups, no loans, and no foreign targets. No namespace/status/global delete is used. Recovery has no automatic retry: before-write failures abort; after-seed failures recover the exact tracked ID; unknown action outcomes classify by exact ID before cleanup; cleanup failure leaves state blocked.

## UI preparation

`request-approve-action.ts` prepares the exact pending fixture path and stops before the final confirmation. It scopes the confirmation dialog by accessible name and does not use `first`, `last`, or `nth` for the critical control.

## Validation

- local TypeScript, Node checks, and directed ESLint: PASS;
- R3 state-gate local tests: PASS;
- R3 seed dry-run: PASS, remote writes `0`;
- R3 cleanup dry-run: PASS, targets `0`;
- R3 verifier pre: PASS;
- R3 runner dry-run: PASS, one test, zero auth dependencies, zero remote writes;
- R1/R2 pre and runner dry-runs: PASS;
- baseline, storage states, and clean-state: PASS; residuals `0`.

## Status

Preparation is closed. `FLOW_R3_OFFICIAL_STATUS=OPEN`. No R3 seed, approval, cleanup, Playwright mutating execution, migration, DB push, reset, truncate, staging, or commit was executed.

## S2 runtime note

The single authorized S2 attempt did not reach `BROWSER_READY` because the browser-armed test failed an extra admin-role text assertion. No seed or cleanup was executed. The next attempt requires a separately reviewed readiness assertion and must not be treated as an automatic retry.

## S2A browser-ready forensic

The R3 readiness assertion is scoped to `/dashboard/solicitudes`: authenticated protected URL plus the rendered request search control. The dashboard-only `Rol: Administrador` text is not part of this route's canonical readiness contract and is not used by the harness.

The READ_ONLY coordinator mode uses the existing `BROWSER_READY -> HANDOFF_DRY_RUN -> ACTION_ARMED_DRY_RUN -> CANCEL -> CLEAN` transition chain. It does not seed or execute business actions. The S2A runtime reached readiness once; its initial close attempt exposed and was locally corrected for the invalid direct transition. No second runtime was launched.
