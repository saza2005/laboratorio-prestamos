# F3BI - Route-aware local Auth killswitch branch

Phase: `F3BI`
Mode: `HARNESS_FIX_ONLY_NO_EXECUTION`

## Change

Modified only:

```text
scripts/e2e/test-flow-l1-f3bb-local-baseline-network-killswitch.mjs
```

The wrapper now extracts method/path from the actual supported fetch input
forms (`string`, `URL`, and `Request`). Only `GET` with pathname
`/auth/v1/admin/users` matches. That branch returns a local `200` JSON
`{ users: [] }` response with `content-type` and zero total count metadata.
This is parser-compatible with the installed Auth client and causes
`validateAuth` to return `ok=false`; it cannot create an Auth PASS.

Every other request still throws `LOCAL_NETWORK_KILLSWITCH`. The original fetch
is never called and remains restored only in the existing `finally` block.
No table, RPC, or other endpoint special cases were added.

## Static validation

```text
WRAPPER_SYNTAX_VALIDATION=PASS
AUTH_ROUTE_MATCHER_STATIC_VALIDATION=PASS
AUTH_RESPONSE_CONTRACT_STATIC_VALIDATION=PASS
GLOBAL_FALLBACK_STATIC_VALIDATION=PASS
NETWORK_ESCAPE_STATIC_VALIDATION=PASS
TARGET_IMPORT_CHANGE=no
COORDINATOR_IMPORT_COUNT=0
INSPECTOR_IMPORT_COUNT=0
AUTH_RESPONSE_USER_COUNT=0
```

The route branch introduces no explicit await, microtask, event-loop turn,
retry, polling, or real fetch. The global fallback remains active for all
post-Auth table reads, so `items=[]` continues to originate from verifier
fail-closed reads rather than synthetic item injection.

## Hashes and execution safety

```text
PRE_F3BI_WRAPPER_HASH=3bc88c633a6f88b3ab7bc385fefe16b6b117bb5d722040eaab4aa048338e63db
POST_F3BI_WRAPPER_HASH=45a591a673f6be33a373b118093463b8021ed72647c3046660e1dca088d4475c
VERIFY_BASELINE_HASH=784fac0f0a2e3eef07924dc5b42812eabdf08b4d08fde404f8237ebfe4e5a0a7
WRAPPER_EXECUTIONS=0
VERIFIER_EXECUTIONS=0
REMOTE_OPERATIONS=0
```

`POST_F3BI_WRAPPER_REFERENCE` is the post-fix wrapper hash above. The runtime
freeze remains `POST_F3BB_AMENDED_FREEZE`.
