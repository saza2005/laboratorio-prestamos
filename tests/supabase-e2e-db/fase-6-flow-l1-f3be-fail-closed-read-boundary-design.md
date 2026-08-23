# F3BE - Fail-closed read boundary reconstruction

Phase: `F3BE`
Mode: `AUDIT_AND_DESIGN_ONLY`

## Reconstructed boundary

The preserved F3AO harness contains the concrete mechanism referenced by the
F3AZ reports:

```js
const originalFetch = globalThis.fetch
globalThis.fetch = async () => { throw new Error('NETWORK_KILLSWITCH') }
try {
  await completion
} finally {
  globalThis.fetch = originalFetch
}
```

It installs the replacement before invoking the preflight/core and restores it
after completion. The Supabase client and query builders can be constructed,
but every actual request reaches the replacement fetch and is converted by
`runBaselineRead()` into a fail-closed result with `rows: []`. No DNS, HTTP,
TLS, socket, or remote Supabase operation is performed.

The exact F3AZ launcher is not separately preserved, but the boundary itself
is concretely present in the preserved F3AO/F3AI/F3AG harnesses and matches the
F3AZ report description.

## Safe future entrypoint design

The existing forensic harness is not the minimum entrypoint because it imports
and invokes the coordinator and starts inspector state. A future F3BB dynamic
validation should use a new harness-only wrapper that:

1. loads `.env.e2e` before importing the verifier;
2. installs the same `globalThis.fetch` kill-switch;
3. imports and invokes `runBaselineCore()` directly;
4. restores `fetch` in `finally`;
5. performs no inspector, coordinator, target, browser, or remote operation.

No wrapper was created or executed in F3BE.

```text
SAFE_ENTRYPOINT_DESIGN=scripts/e2e/test-flow-l1-f3bb-local-baseline-network-killswitch.mjs
NEW_HARNESS_FILE_COUNT=1
TARGET_FACING_IMPORT_CHANGE=no
TARGET_FACING_CALL_GRAPH_CHANGE=no
```

The wrapper's one `await` is the inherent async boundary required to await the
verifier result. It adds no pre-coordinator instrumentation boundary because
it never imports or invokes the coordinator.

## Safety conclusion

With the boundary installed before core invocation, actual remote operation
reachability is zero. The logical Supabase query calls remain in the verifier,
but their transport terminates at the local replacement fetch. This is a
harness-only design and leaves `POST_F3BB_AMENDED_FREEZE` unchanged.

No dynamic execution, runtime change, harness change, inspector session, or
remote operation occurred.
