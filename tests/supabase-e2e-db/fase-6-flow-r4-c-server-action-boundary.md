# FLOW-R4-C - Grouped-create Server Action boundary diagnostic

## Scope

One authorized `chromium-teacher` runtime was used. The form was prepared from a fresh durable PRE snapshot. Exactly one diagnostic submit click was authorized. Every page-originated POST was blocked before Next. No grouped request creation, business RPC, cleanup, or remote write was authorized or executed.

## Browser and POST capture

The browser reached `/solicitudes/grupal` with teacher permission and the minimal valid grouped payload. The exact submit control was unique, visible, and enabled. The click was performed once.

The sanitized artifact contains only safe request metadata. It recorded:

1. same-origin `/solicitudes/grupal`, `SERVER_ACTION`, Next-Action present, blocked, reached Next `no`;
2. same-origin `/__nextjs_original-stack-frames`, `FRAMEWORK_DIAGNOSTIC`, blocked, reached Next `no`.

There were no unexpected application POSTs, second Server Actions, or unknown POSTs. The final accounting stabilized at two POSTs and satisfied the invariant.

## DB classification and safety

After the blocked click, READ_ONLY classification found:

- teacher request set equal to PRE;
- current-run request count `0`;
- new request delta `0`;
- requests, request_items, request_groups, and request_group_items created `0`;
- business RPC executions `0`;
- remote writes `0`.

No cleanup was executed. The canonical diagnostic handshake was validated as:

`BROWSER_STARTING -> BROWSER_READY -> HANDOFF_DRY_RUN -> ACTION_ARMED_DRY_RUN -> CANCEL -> CLEAN`

It had zero invalid transitions, one terminal handshake, and no `ACTION_GO`, `ACTION_RUNNING`, or `ACTION_DONE`.

Postflight baseline, storageState, clean-state, and R4 PRE all passed. Hashes matched, residual mutating was `0`, and state was CLEAN. No Playwright, Chromium, or E2E orphan process remained.

## Result

```text
R4_C_BROWSER_RUNS=1
R4_C_SUBMIT_CLICKS=1
R4_GROUP_CREATE_SERVER_ACTION_POST_ATTEMPTS=1
R4_FRAMEWORK_DIAGNOSTIC_POST_ATTEMPTS=1
R4_UNEXPECTED_APPLICATION_POST_ATTEMPTS=0
R4_SECOND_SERVER_ACTION_POST_ATTEMPTS=0
R4_UNKNOWN_POST_ATTEMPTS=0
R4_GROUP_CREATE_SERVER_ACTION_ALLOWED_TO_NEXT=0
R4_GROUP_CREATE_SERVER_ACTION_REACHED_NEXT=no
R4_BUSINESS_RPC_EXECUTIONS=0
REMOTE_WRITES=0
R4_ACTION_RUNNING_COUNT=0
R4_ACTION_DONE_COUNT=0
STATE=CLEAN
```

`R4_GROUP_CREATE_SERVER_ACTION_BOUNDARY_STATUS=CLOSED`

The next step requires a separate explicit authorization for the first real grouped-request creation attempt. This phase did not create a grouped request.

R4-C remains the historical zero-write boundary diagnostic. Its frozen sanitized Server Action contract was reused by R4-REAL-1; the C result itself is unchanged.
