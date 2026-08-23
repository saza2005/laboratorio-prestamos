# FLOW-R3 S3B - Sanitized POST capture

## Scope

S3B used one browser-first seed, one diagnostic final confirmation click, a page-wide POST kill-switch, and one exact cleanup. No page POST reached Next and no approval business write was authorized.

## Capture contract

The harness wrote a local JSON artifact before classifying each POST. It stored ordinal, monotonic timing, phase, method, same-origin flag, sanitized path class, resource type, boolean header/content-type metadata, safe content-type class, framework-candidate boolean, blocked state, reached-Next state, and classifier result. It stored no body, cookies, tokens, opaque header values, query values, or UUIDs.

## Captured records

- Record 1: `/dashboard/solicitudes`, fetch, Next-Action present, `AFTER_REAL_CONFIRM`, classifier `SERVER_ACTION`, blocked.
- Record 2: `/__nextjs_original-stack-frames`, fetch, Next-Action absent, `text/plain`, `AFTER_REAL_CONFIRM`, runtime classifier initially `UNKNOWN_OR_UNEXPECTED_POST`, blocked.

Both records were captured before the fail-closed decision. Neither reached Next.

## Correlation and fix

Next `16.2.2` local webpack and Turbopack dev middleware register `/__nextjs_original-stack-frames` as an internal POST route for resolving original stack frames. No application or harness generator for the extra POST was found. The classifier was corrected after runtime by normalizing `content-type` to its media type before applying the existing exact framework contract. It still requires same-origin, exact path, no Next-Action, fetch, and non-navigation. Unknown POSTs remain fail-closed.

## Validation

- Sanitized capture tests: PASS.
- Preserved metadata replay: PASS; approval Server Action `1`, framework diagnostic `1`, unexpected `0`.
- Negative classifier, completion, handshake, lifecycle, ACTION_DONE, and tracking tests: PASS.
- Remote postflight: baseline/storageState/clean-state PASS, hashes MATCH, residuals `0`, state CLEAN.

## Status

`R3_S3B_SANITIZED_POST_CAPTURE_STATUS=CLOSED`

`R3_S3_EXTRA_POST_FORENSIC_STATUS=CLOSED`

`R3_APPROVAL_SERVER_ACTION_BOUNDARY_STATUS=INCOMPLETE`

`FLOW_R3_OFFICIAL_STATUS=OPEN`

## S3C follow-up

S3B's corrected classifier was frozen and exercised in the separately authorized S3C runtime. The persisted S3C sanitized artifact again contains the two known blocked POST contracts: one approval Server Action and one exact Next original-stack-frames diagnostic. No approval reached Next, no business write occurred, and exact cleanup/postflight passed. S3B remains historical evidence and is not reclassified.
