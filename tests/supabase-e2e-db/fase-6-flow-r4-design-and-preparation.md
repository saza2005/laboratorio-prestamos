# FLOW-R4 - Canonical definition and preparation stop

## Decision

`FLOW_R4_DEFINITION_CONFLICT=yes`

The requested cancellation hypothesis conflicts with the repository's canonical inventory. The repository-defined R4 is grouped request creation. The separate cancellation RPC remains documented as a portal-owner operation, but it is not classified as R4 by the current entrypoint inventory.

## Evidence

`tests/supabase-e2e-db/fase-6-mutating-entrypoints.csv` identifies R4 as `group request`, `/solicitudes`, `teacher`, `createGroupRequest`, `create_request_transaction`, and the four request/group tables.

The implementation matches that entry:

- `app/solicitudes/grupal/page.tsx` gates the route to teachers.
- `app/solicitudes/request-form-groups.tsx` submits grouped request fields.
- `app/solicitudes/actions.ts` parses groups and calls `create_request_transaction` with `p_groups`.
- The RPC validates teacher role for groups and inserts request/group rows.

The cancellation implementation is separate:

- route surface: `/solicitudes/mis-solicitudes`
- control: `CancelRequestButton`
- Server Action: `cancelOwnRequestWithState`
- RPC: `cancel_own_request_transaction`
- ownership: required
- transition: `pending -> cancelled`

## Preparation boundary

Because the canonical operation is conflicted, no actor/storageState/fixture/seed/cleanup/browser-first contract is promoted to R4 preparation. No shared harness or business code was changed. No remote preflight was consumed after the conflict was demonstrated.

`R4_DESIGN_AND_PREPARATION_STATUS=BLOCKED_BY_DEFINITION_CONFLICT`

`R4_SEED_REAL_EXECUTED=no`

`R4_UI_CONTRACT_RUNTIME=DEFERRED`

`R4_CLEANUP_EXACT_ID_ONLY=UNDEFINED_UNTIL_DEFINITION_CONFIRMED`

## Preparation closure

The grouped-request definition is now confirmed. The effective action is `createRequestWithState`; `createGroupRequest` is stale inventory naming and is not exported by the current code.

### Canonical contract

- `R4_ENTRY_ROUTE=/solicitudes`
- `R4_GROUP_FORM_ROUTE=/solicitudes/grupal`
- `R4_CANONICAL_RUNTIME_ROUTE=/solicitudes/grupal`
- `R4_CANONICAL_ACTOR_ROLE=teacher`
- `R4_ALLOWED_ACTOR_ROLES=teacher`
- `R4_EXPECTED_PLAYWRIGHT_PROJECT=chromium-teacher`
- `R4_EXPECTED_STORAGE_STATE=teacher.json`
- `R4_PARENT_REQUEST_ROLE=requests parent, status pending`
- `R4_REQUEST_ITEMS_ROLE=one aggregated item row per distinct item`
- `R4_REQUEST_GROUPS_ROLE=group metadata and student leader`
- `R4_REQUEST_GROUP_ITEMS_ROLE=group-to-item quantity rows`
- `R4_MINIMUM_VALID_GROUP_COUNT=1`
- `R4_MINIMUM_GROUP_ITEM_COUNT=1`
- `R4_MINIMUM_REQUEST_ITEM_COUNT=1`
- `R4_MINIMUM_REQUEST_QUANTITY=1`

### RPC and footprint

`create_request_transaction(text, text, date, jsonb, jsonb) returns uuid`, `SECURITY DEFINER`, `search_path=public, pg_temp`. It requires `auth.uid()`, permits `student`/`teacher` for requests, requires `teacher` for non-empty `p_groups`, validates active items and aggregate stock, and inserts grouped request rows. It does not update items, item_units, or inventory_movements.

Expected minimal delta: requests `1 INSERT`, request_items `1 INSERT`, request_groups `1 INSERT`, request_group_items `1 INSERT`, all other business writes `0`. Created status is `pending`; approved quantity is `0`; reviewer metadata is absent. The R4 risk is `MEDIUM_MUTATION` because four related tables are created but no inventory is coupled.

### UI, completion, and email

The form uses labels and nested named fields, with submit control `Enviar solicitud con grupos`. There is no confirmation dialog in the current grouped form. Success returns through `redirect('/solicitudes')`; failure returns `state.error` through `getActionErrorMessage`. No `revalidatePath` is used. The Server Action uses Next redirect control flow, so `response.ok` is not an absolute gate; correlated completion plus DB classification is required. The request-created email is attempted and is nonfatal; future E2E delivery must be controlled or disabled/sandboxed.

### Fixture and tracking

Namespace: `E2E_MUT_REQ_R4_`; conflict: `no`. Reference-only prerequisites are the existing E2E teacher, an active E2E bulk item with stock, and an active E2E student leader. Profiles/items are not modified. The grouped request itself is created by the future UI action, so `R4_REAL_BUSINESS_ENTITY_SEEDED_BEFORE_ACTION=no`, `R4_PREREQUISITE_SEED_REQUIRED=no`, and no R4 seed script is created.

The exact identification strategy uses the unique purpose/comment namespace, teacher actor, creation attempt marker, group relationship, leader, and reference item; it never uses latest/first/last. Pre-ID tracking is ready and the untracked write window is `0`; after creation the exact request/group/item IDs are persisted for cleanup.

### Verification and cleanup

`verify-mutating-flow-r4.mjs --stage=pre` passed READ_ONLY with zero R4 namespace requests and groups. Created-stage and delta contracts are defined but not executed. Cleanup is exact-ID-only and supports a pending created request; designed order is `request_group_items -> request_groups -> request_items -> requests`. It does not touch other teacher requests, baseline groups, items, or profiles. The dry-run passed with remote writes `0`; `--execute` is rejected in this preparation phase.

### Reuse and readiness

R2/R3 request classifier, sanitized capture, completion coordinator, ACTION_DONE/DB barrier, tracking model, browser-first coordinator, and hardened clean-state reliability are reusable. The future single-action gate must allow exactly one grouped-create Server Action and block unknown, second, or unexpected POSTs. Browser readiness is `/solicitudes` with the teacher portal surface; the future action surface is `/solicitudes/grupal` in the same Chromium.

`R4_STATE_ALLOWLIST_READY=yes`

`R4_REMOTE_WRITE_TRACKING_READY=yes`

`R4_UNTRACKED_WRITE_WINDOW=0`

`R4_BROWSER_FIRST_READY=yes`

`R4_AMBIGUOUS_CREATION_RECOVERY_READY=yes`

`R4_ACTION_DONE_DB_CONFIRMATION_REQUIRED=yes`

`R4_DESIGN_AND_PREPARATION_STATUS=CLOSED`

`FLOW_R4_OFFICIAL_STATUS=OPEN`

No grouped request, business RPC, cleanup, or mutating Playwright runtime was executed.

## R4-B UI contract blocker

The grouped form has no editable `group_name` control. It initializes `Grupo 1` and renders a controlled hidden input. Because the current authorized design requires a namespace-bearing group name for exact post-create identity, browser rehearsal cannot safely proceed without a separately authorized business-UI contract decision. The existing purpose/comments namespace is not silently substituted for the required group-name identity.

## B1 identity-contract forensic closure

The UI blocker was re-evaluated without changing application code. `requests.purpose` is persisted from the canonical FormData and can carry the run marker; `request_groups.group_name` remains a verified business field with the application value `Grupo 1`, not the primary identity key.

The approved harness model is:

`PRE teacher request-ID snapshot -> POST minus PRE -> exactly one candidate -> exact relational signature -> captured parent/child IDs`

The model fails closed for zero candidates, multiple candidates, signature mismatch, and partial child rows. The PRE set must be restored exactly after future exact-ID cleanup. Local synthetic tests for all these branches, exact-ID cleanup arming, and PRE restoration passed. One READ_ONLY remote PRE snapshot and one standard READ_ONLY preflight passed; no browser or mutation occurred.

`R4_EXACT_IDENTIFICATION_WITHOUT_UI_CHANGE=yes`

`R4_UI_BUSINESS_CHANGE_REQUIRED=no`

`R4_POST_CREATE_IDENTITY_CONTRACT_STATUS=CLOSED`

## B2 browser rehearsal closure

The revised identity contract was validated in one `chromium-teacher` runtime without changing the application. The browser filled only the editable `purpose`, selected the exact controlled E2E student and item, set quantity `1`, verified the controlled hidden `Grupo 1`, and validated the FormData shape. The exact submit was located and enabled but never clicked. The page POST kill-switch observed zero POST attempts.

`R4_REFERENCE_AND_BROWSER_REHEARSAL_STATUS=CLOSED`
