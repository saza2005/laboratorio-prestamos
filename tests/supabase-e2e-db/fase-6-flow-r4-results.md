# FLOW-R4 - Definition audit result

## Status

The current repository does not support the hypothesis that FLOW-R4 is owner cancellation. Preparation stopped before any remote preflight, browser, seed, business RPC, cancellation, or cleanup.

`R4_DESIGN_AND_PREPARATION_STATUS=BLOCKED_BY_DEFINITION_CONFLICT`

`FLOW_R4_OFFICIAL_STATUS=OPEN`

`FLOW_R3_OFFICIAL_STATUS=CLOSED`

## Canonical definition found in the repository

The local mutating inventory defines R4 as:

- operation: grouped request creation
- route: `/solicitudes`
- actor: `teacher`
- UI trigger: group request form
- Server Action: `createGroupRequest`
- RPC: `create_request_transaction`
- expected tables: `requests`, `request_items`, `request_groups`, `request_group_items`
- risk: `MEDIUM_MUTATION`

The current UI confirms this through `app/solicitudes/grupal/page.tsx`, `RequestFormGroups`, `canCreateGroupRequests`, and the grouped payload parsed by `app/solicitudes/actions.ts`.

## Separate cancellation operation

`cancel_own_request_transaction(uuid)` is a distinct owner-cancellation operation exposed by `app/solicitudes/actions.ts` and rendered by `CancelRequestButton` in `/solicitudes/mis-solicitudes`. Its contract is authenticated `student`/`teacher`, ownership required, pre-status `pending`, and post-status `cancelled`.

It is not the current R4 entry in `fase-6-mutating-entrypoints.csv`. No R4 harness, fixture, seed, verifier, cleanup, or runtime was prepared from the cancellation hypothesis.

## Safety

- Seed: `0`
- Cancellation/business RPC: `0`
- Cleanup: `0`
- Browser/Playwright: `0`
- Remote writes: `0`
- Migration, reset, truncate, staging, and commit: `0`

Next safe step: obtain explicit clarification or authorization to audit the repository-defined grouped-request R4, rather than owner cancellation.

## Repository-defined grouped request R4

The conflict is resolved in favor of the current implementation. The stale inventory label `createGroupRequest` is not an exported function; the effective chain is:

`RequestFormGroups -> useActionState(createRequestWithState) -> persistRequest -> parseGroups -> create_request_transaction -> sendTransactionalEmail(request-created) -> redirect('/solicitudes')`

Canonical route: `/solicitudes/grupal`, linked from `/solicitudes`.

Canonical actor and storage: `teacher`, `chromium-teacher`, `teacher.json`. The page guard, `canCreateGroupRequests`, Server Action, and RPC all require teacher for grouped requests.

Minimum valid fixture from code: 1 group, 1 active student leader, 1 group item, quantity `1`. The grouped payload is FormData nested as `groups[i][group_name]`, `groups[i][leader_student_id]`, `groups[i][items][j][item_id]`, and `groups[i][items][j][quantity]`; the wrapper sends `p_items=[]` and `p_groups=[{group_name, leader_student_id, items:[{item_id, quantity}]}]`.

Expected create footprint for the minimal fixture: `requests INSERT=1`, `request_items INSERT=1`, `request_groups INSERT=1`, `request_group_items INSERT=1`; updates/deletes and all inventory, unit, movement, loan, return, and maintenance writes `0`. The RPC only validates active item stock and creates relational request rows. Created state is `pending`, approved quantity `0`, reviewer metadata absent.

Email side effect is present but nonfatal. The eventual E2E environment must use a controlled E2E recipient or disabled/sandboxed delivery.

Pre-ID tracking is designed around a unique `E2E_MUT_REQ_R4_` purpose/comment marker, teacher actor, group relationships, reference item, and creation attempt count; the captured request/group IDs become durable cleanup state. No request entity was seeded before the action.

The R4 PRE verifier passed with zero namespace requests/groups and zero writes. Cleanup dry-run passed with exact order `request_group_items -> request_groups -> request_items -> requests`; real cleanup was not executed.

`R4_DESIGN_AND_PREPARATION_STATUS=CLOSED`

`FLOW_R4_OFFICIAL_STATUS=OPEN`

`FLOW_R3_OFFICIAL_STATUS=CLOSED`

Next safe step: obtain explicit authorization for FLOW-R4 grouped-request fixture/data review and browser-ready rehearsal. No grouped request was created.

## R4-B1 post-create identity contract

R4-B remains historically `BLOCKED_BY_UI_CONTRACT`: no browser runtime or grouped-request mutation was executed. B1 resolves the post-create identity blocker at the harness level without changing `RequestFormGroups` or business code.

The revised contract captures a durable PRE snapshot of all requests belonging to the controlled teacher, then recovers the post-action request by set difference. Zero candidates and multiple candidates fail closed. A single candidate must pass the complete relational signature: teacher owner, `purpose` run marker, pending status, one request item, one group, one group item, default `Grupo 1` group name, exact E2E student leader, exact E2E bulk item, quantity `1`, approved quantity `0`, and absent reviewer metadata. Exact parent and child IDs are then persisted locally for future verifier and cleanup use.

`R4_POST_CREATE_IDENTITY_CONTRACT_STATUS=CLOSED`

`R4_REFERENCE_AND_BROWSER_REHEARSAL_STATUS=BLOCKED_BY_UI_CONTRACT`

Next safe step: obtain explicit authorization for a fresh R4-B browser rehearsal using the PRE-snapshot, post-create set-difference, and exact relational signature contract. No grouped request was created.

## R4-B2 revised browser rehearsal

The revised PRE-SNAPSHOT identity contract was exercised once in the teacher browser with no submit authorization. The purpose input was editable and populated from the durable run marker; the hidden group name remained untouched and verified as `Grupo 1`; the exact E2E student leader, E2E bulk-compatible item, and quantity `1` produced a valid minimal grouped payload.

The first reference validation stopped before browser because the persisted enum for the E2E bulk-compatible item is `consumable`, not a literal `bulk` enum. This was confirmed from the repository schema and baseline manifest, the harness check was corrected before runtime, and the final READ_ONLY reference validation passed. No application or data change was made.

The single teacher Playwright rehearsal passed on `/solicitudes/grupal`: form count `1`, submit count `1`, submit visible/enabled, submit clicks `0`, page POST attempts `0`, Server Action POST `0`, business RPC `0`. The teacher request-ID set remained identical to PRE. Postflight baseline/storageState/clean-state/R4 PRE passed with hashes MATCH, residual mutating `0`, and state CLEAN.

`R4_REFERENCE_AND_BROWSER_REHEARSAL_STATUS=CLOSED`

`R4_B2_SUBMIT_CLICKS=0`

`R4_B2_BUSINESS_EXECUTIONS=0`

Next safe step: obtain explicit authorization for the R4 grouped-create Server Action boundary diagnostic. No grouped request was created.

## R4-C grouped-create Server Action boundary diagnostic

The single authorized teacher browser runtime prepared the exact grouped form and performed one diagnostic click on `Enviar solicitud con grupos`. The sanitized capture recorded exactly two POSTs: one same-origin Server Action candidate at `/solicitudes/grupal` and one known Next framework diagnostic at `/__nextjs_original-stack-frames`. Both were blocked before Next. There were no unexpected, second Server Action, or unknown POSTs.

Final accounting: raw POSTs `2`, grouped-create Server Action `1`, framework diagnostic `1`, all blocked, reached Next `0`. Business RPCs and remote writes were `0`. READ_ONLY DB classification found no new request, request item, group, or group item; the teacher request set equaled PRE exactly. Postflight baseline/storageState/clean-state/R4 PRE passed with hashes MATCH, residual mutating `0`, and state CLEAN.

`R4_GROUP_CREATE_SERVER_ACTION_BOUNDARY_STATUS=CLOSED`

`FLOW_R4_OFFICIAL_STATUS=OPEN`

Next safe step: obtain explicit authorization for the first REAL FLOW-R4 grouped-request creation attempt. No grouped request was created.

## R4-REAL-1 first grouped-request creation

The new explicit mutation authorization executed one teacher browser run on `/solicitudes/grupal`, with no prerequisite seed. The durable PRE snapshot and tracking were captured before browser startup and the teacher request set was unchanged immediately before `ACTION_GO`.

Exactly one submit click and one grouped-create Server Action reached Next. Completion was redirect-compatible 3xx with `response.ok=false`; this was observed but was not an absolute success gate. No second Server Action, unknown POST, or unexpected application POST occurred. The request-created email hook was nonfatal and did not retry because E2E Resend delivery was disabled.

DB classification found exactly one PRE-to-POST request candidate matching the purpose and full grouped relational signature. The business footprint was exactly one insert each in `requests`, `request_items`, `request_groups`, and `request_group_items`; updates, deletes, inventory/item/item-unit/movement/loan/return/audit, and other business writes were zero. `create_request_transaction` executed once and exact IDs were captured locally without exposing them.

Exact cleanup ran once using captured IDs. Post-cleanup verification passed, the teacher request and child sets matched PRE exactly, and hardened postflight baseline/storageState/clean-state passed with matching hashes, zero residual mutating state, and `STATE=CLEAN`. Playwright and business classification passed; `ACTION_DONE` was published once.

`FLOW_R4_REAL_ATTEMPT_1_STATUS=CLOSED`

`BUSINESS_FLOW_R4_VALIDATED=yes`

`PLAYWRIGHT_ORCHESTRATION_R4_VALIDATED=yes`

`FLOW_R4_OFFICIAL_STATUS=CLOSED`

No retry, second attempt, R5, or L1 was started. Stop and await explicit authorization before any subsequent flow.

## R4-B reference review and browser rehearsal

- Deterministic reference review passed: controlled E2E student leader and active E2E bulk item reference, with no reference mutation.
- Namespace collision PRE check and R4 verifier PRE passed with zero R4 requests/groups and zero writes.
- Local gates and hardened remote preflight passed: baseline/storageState/clean-state PASS, hashes MATCH, residual mutating `0`, state CLEAN.
- Browser was intentionally not started after static UI review found that `RequestFormGroups` keeps `group_name` as a controlled hidden `Grupo 1` value and exposes no editable namespace-bearing group-name control. A helper-side DOM edit would not be a reliable React payload.
- `R4_REFERENCE_AND_BROWSER_REHEARSAL_STATUS=BLOCKED_BY_UI_CONTRACT`; no browser, submit, Server Action, RPC, request creation, cleanup, or remote write occurred.
