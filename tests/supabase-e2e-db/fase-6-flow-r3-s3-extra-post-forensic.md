# FLOW-R3 S3A - Unknown POST forensic

## Scope

This phase was READ_ONLY/local forensic work. No browser, seed, approval, cleanup, RPC, or remote write was executed.

## Preserved artifacts

Available: the Playwright failure screenshot and `error-context.md`. Unavailable: request/network log, trace, raw sanitized POST metadata, browser console log, and runner POST accounting output.

The error context records `unexpected_application_post` after the single diagnostic confirm click and shows the Next error surface. It does not contain the extra request pathname, headers, resource type, content type, or initiator.

## Static evidence

The approval candidate was positively counted by the runtime before the fail-closed assertion. The additional POST cannot be reconstructed from the preserved artifact. Local Next `16.2.2` source shows `/__nextjs_original-stack-frames` is registered by the webpack and Turbopack dev overlay middleware, accepts POST, and resolves original stack frames. This establishes a plausible framework diagnostic mechanism but not that S3 used it.

No application code or harness code was found that independently generates an extra POST for this path. The classifier was not changed. Unknown application POSTs, second Server Action candidates, incomplete framework-like metadata, and known exact diagnostic metadata remain covered by fail-closed/positive tests.

## Results

- Classifier defect demonstrated: `no`.
- Classifier hotfix: `no`.
- UNKNOWN fail-closed preserved: `yes`.
- Preserved S3 metadata replay: `NOT_EXECUTED`, because the required metadata is absent.
- TypeScript, Node checks, directed ESLint, classifier, completion, handshake, lifecycle, ACTION_DONE, and tracking tests: `PASS`.
- Remote READ_ONLY baseline/storageState/clean-state: `PASS`; hashes MATCH; residuals `0`; state CLEAN.

## Status

`R3_S3_EXTRA_POST_FORENSIC_STATUS=INCOMPLETE`

`R3_APPROVAL_SERVER_ACTION_BOUNDARY_STATUS=INCOMPLETE`

`FLOW_R3_OFFICIAL_STATUS=OPEN`

Next safe step: preserve sanitized per-POST metadata in a newly authorized diagnostic run before changing the classifier or attempting another boundary validation.

## S3B closure

The newly captured artifact supplied the missing evidence. It contains exactly two records: one same-origin approval Server Action with Next-Action present, and one same-origin `/__nextjs_original-stack-frames` fetch without Next-Action and with `text/plain` media type. Both were blocked before Next.

Local Next source confirms the second route belongs to the dev overlay and accepts POST for original stack frames. Application and harness audits found no competing generator. The classifier fix is narrow: normalize the content-type media type, then require the existing exact framework route contract. Unknown remains fail-closed.

Sanitized replay and negative tests pass. Remote postflight remains clean. `R3_S3B_SANITIZED_POST_CAPTURE_STATUS=CLOSED`.
