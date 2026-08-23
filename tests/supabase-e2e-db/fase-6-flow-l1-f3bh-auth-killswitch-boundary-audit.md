# F3BH - Auth listUsers killswitch boundary audit

Phase: `F3BH`
Mode: `AUDIT_AND_DESIGN_ONLY`

## Findings

`validateAuth` calls `client.auth.admin.listUsers({ page: 1, perPage: 1000 })`
at line 139 of `scripts/e2e/verify-baseline.mjs`. The installed `auth-js`
implementation calls fetch and catches `AuthError` failures, returning:

```text
{ data: { users: [] }, error: AuthRetryableFetchError }
```

`runBaselineRead` converts the error-bearing result to its existing
fail-closed `{ ok: false, rows: [] }` shape. `validateAuth` then returns
`ok=false` while retaining the local expected-user ID map for subsequent
checks. It does not produce an Auth PASS and does not require real users or
credentials to continue.

F3BG's observed early harness failure was the rejected fetch path surfacing
before the verifier's intended Auth result normalization. A route-aware local
Auth response is therefore required before the global fallback killswitch.

## Minimal future boundary design

Modify only the F3BF wrapper. Keep the global killswitch active, but replace it
with a route-aware local fetch boundary:

```text
AUTH /auth/v1/admin/users -> local non-success response with no user data
every other route          -> LOCAL_NETWORK_KILLSWITCH rejection
```

This yields `users=[]`, `ok=false`, and preserves fail-closed Auth semantics.
It does not fabricate users, credentials, UUIDs, or a positive Auth result.
All later table reads remain behind the global killswitch and produce the
existing empty-row failures, allowing the verifier to reach
`quantitativeOkFn`.

```text
AUTH_BOUNDARY=GLOBAL_FETCH_ROUTE_AWARE_STUB
REAL_FETCH_REQUIRED=no
AUTH_DATA_REQUIRED=no
AUTH_SECRET_DATA_REQUIRED=no
NEW_PROTOCOL_OR_NETWORK_CALLS=0
TARGET_IMPORT_CHANGE=no
COORDINATOR_IMPORT_COUNT=0
INSPECTOR_IMPORT_COUNT=0
```

The proposed route stub is synchronous in its decision and returns the normal
fetch Promise/Response contract; it adds no explicit await, event-loop turn,
retry, polling, or sleep.

No wrapper, runtime, environment, or freeze file was modified in F3BH.
