# FLOW-R3 S3 - Approval click to Server Action boundary

## Scope

S3 was authorized as a READ_ONLY business-boundary diagnostic. It allowed one real R3 seed, one diagnostic final Approve click, and one exact cleanup. The Server Action POST was required to be aborted before Next.

## Result

- Browser readiness: PASS, one Playwright and one Chromium.
- Seed: exactly one RPC, one request insert, one request_item insert; seeded verifier PASS.
- Same browser, canonical state gate, exact fixture, Detail, initial Approve control, and `Aprobar solicitud` dialog: PASS.
- Initial Approve click: exactly one; POST attempts after it: `0`.
- Final diagnostic confirm click: exactly one; kill-switch active.
- Approval RPC: `0`; approval request updates: `0`; approval request_item updates: `0`; no request reached Next.

## Fail-closed classification

After the final diagnostic click, the harness observed the approval Server Action candidate and an additional POST that the current classifier marked `UNKNOWN_OR_UNEXPECTED_POST`. The test failed closed before publishing the terminal diagnostic handshake. No retry or second click occurred. The extra POST must be classified from safe request metadata before any future boundary rerun.

## Cleanup and restoration

Cleanup executed once in exact order `request_items -> requests`. The corrected post-cleanup verifier passed. Baseline, storageState, and clean-state postflight passed with matching hashes and zero residuals. No approval or business write occurred.

## Status

`R3_APPROVAL_SERVER_ACTION_BOUNDARY_STATUS=INCOMPLETE`

`R3_REAL_SEED_AND_UI_REHEARSAL_STATUS=CLOSED`

`FLOW_R3_OFFICIAL_STATUS=OPEN`

## Real attempt 1 result

The authorized real attempt created and verified one R3 fixture after browser readiness, but failed before `ACTION_ARMED` because the initial Approve locator resolved two controls: the intended submit and the confirmation dialog button within the broad form scope. The final confirmation was not clicked. Approval Server Action, approval RPC, approval updates, and `ACTION_DONE` were all `0`.

Exact cleanup ran once and postflight returned baseline/storageState/clean-state PASS, matching hashes, zero residuals, and CLEAN state. No retry is authorized.

`BUSINESS_DB_RESULT=NOT_EXECUTED_OR_BLOCKED`
`R3_APPROVAL_SERVER_ACTION_BOUNDARY_STATUS=CLOSED`
`FLOW_R3_OFFICIAL_STATUS=OPEN`

## S3C corrected runtime

The single authorized corrected-classifier runtime used one browser-first seed, one diagnostic final confirmation click, and one exact cleanup. The classifier was frozen for the runtime and was not changed during or after it.

The persisted sanitized capture contains exactly two blocked POSTs after the final confirmation:

- approval Server Action: `/dashboard/solicitudes`, fetch, Next-Action present;
- framework diagnostic: `/__nextjs_original-stack-frames`, fetch, Next-Action absent, `text/plain`.

Both were classified by the corrected exact contract. No unexpected application POST, second Server Action, or UNKNOWN POST remained. Neither reached Next. Approval RPC and approval updates were `0`; `ACTION_DONE` was `0`; the fixture remained pending. Exact cleanup ran once and all postflight verifiers passed.

The coordinator printed the framework diagnostic aggregate before the delayed capture/classification update, but the sanitized artifact is the authoritative per-request record. This is an observability-order note, not a retry or a second runtime.

`R3_APPROVAL_SERVER_ACTION_BOUNDARY_STATUS=CLOSED`
`R3_REAL_SEED_AND_UI_REHEARSAL_STATUS=CLOSED`
`FLOW_R3_OFFICIAL_STATUS=OPEN`

## S3A unknown POST forensic

The S3 artifact set contains only the failure screenshot and Playwright error context. It does not contain a request log, trace, or safe POST metadata. Therefore the extra POST cannot be identified by pathname, resource type, content type, or Next-Action presence.

Next `16.2.2` local source confirms that `/__nextjs_original-stack-frames` is a framework dev-overlay POST route, matching the historical R2 diagnostic mechanism, but the S3 artifact does not prove that route was used. No classifier rule was changed and UNKNOWN remains fail-closed. Application and harness audits found no extra POST generator.

`R3_S3_EXTRA_POST_FORENSIC_STATUS=INCOMPLETE`

## S3B sanitized capture result

S3B captured exactly two sanitized POST records before classification failure. The first was the approval Server Action candidate with Next-Action presence. The second was `/__nextjs_original-stack-frames`, a fetch without Next-Action and with `text/plain` media type, matching the Next dev-overlay route confirmed in local Next `16.2.2` source.

Both were blocked before Next. No approval RPC/update occurred. A narrow classifier fix now normalizes the media type while retaining exact path, same-origin, fetch, non-navigation, and no-Next-Action requirements. Unknown remains fail-closed. Sanitized replay passed with one Server Action and one framework diagnostic.

`R3_S3B_SANITIZED_POST_CAPTURE_STATUS=CLOSED`
`R3_APPROVAL_SERVER_ACTION_BOUNDARY_STATUS=INCOMPLETE`
