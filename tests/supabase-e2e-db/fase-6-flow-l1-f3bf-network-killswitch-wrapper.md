# F3BF - Network-killswitch local baseline wrapper

Phase: `F3BF`
Mode: `HARNESS_FIX_ONLY_NO_VERIFIER_EXECUTION`

## Wrapper

Created exactly one new harness file:

```text
scripts/e2e/test-flow-l1-f3bb-local-baseline-network-killswitch.mjs
```

The wrapper loads `.env.e2e`, saves `globalThis.fetch`, installs an async
replacement that rejects locally with the secret-free error
`LOCAL_NETWORK_KILLSWITCH`, then dynamically imports and invokes only
`runBaselineCore`. The original fetch is restored in `finally`. No static
verifier import can evaluate before the killswitch.

The wrapper does not import or invoke coordinator, target, inspector, browser,
or Playwright code. It does not inject synthetic items or patch
`quantitativeOkFn`; empty read rows must continue to originate from the
verifier's existing fail-closed read handling.

## Static validation

```text
WRAPPER_SYNTAX_VALIDATION=PASS
KILLSWITCH_ORDER_STATIC_VALIDATION=PASS
NETWORK_ESCAPE_STATIC_VALIDATION=PASS
FETCH_RESTORATION_STATIC_VALIDATION=PASS
WRAPPER_AWAIT_COUNT=1
WRAPPER_MICROTASK_BOUNDARY_COUNT=1
WRAPPER_EVENT_LOOP_TURN_COUNT=0
```

The Supabase client may construct query objects and requests may reach the
replacement fetch, but the original fetch is unreachable during core
invocation. Therefore DNS, HTTP, TLS, sockets, and real remote Supabase
operations cannot escape the killswitch.

## Safety and freeze

```text
TARGET_EXECUTIONS=0
LOCAL_BASELINE_VERIFIER_EXECUTIONS=0
COORDINATOR_EXECUTIONS=0
INSPECTOR_SESSION_EXECUTIONS=0
REMOTE_OPERATIONS=0
RUNTIME_FILES_CHANGED=0
HARNESS_FILES_CHANGED=1
ENV_FILES_CHANGED=0
POST_F3BB_AMENDED_FREEZE_CHANGED=no
VERIFY_BASELINE_HASH=784fac0f0a2e3eef07924dc5b42812eabdf08b4d08fde404f8237ebfe4e5a0a7
```

The wrapper is ready for one separately authorized local verifier execution.
