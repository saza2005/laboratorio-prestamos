# F3BD - Local verifier remote capability provenance audit

Phase: `F3BD`
Mode: `AUDIT_ONLY`

## Conclusion

The exact F3AZ launcher was not preserved. Its report identifies a
`runBaselineCore()` execution with a fail-closed `fetch` boundary, but does
not preserve the command, boundary implementation, injected fetch, or a
reproducible artifact. The current verifier entrypoint is therefore not
proven equivalent to the F3AZ execution.

Static inspection of `scripts/e2e/verify-baseline.mjs` shows a reachable
Supabase client and direct query operations. `runBaselineRead()` invokes the
query operation it receives and has no network kill-switch. Consequently,
remote network capability is `UNPROVEN` for a future direct execution.

No verifier, target, coordinator, inspector, or network operation was run.

## Static evidence

```text
F3AZ_ENTRYPOINT=runBaselineCore() (exact launcher not preserved)
F3AZ_MECHANISM=fail-closed fetch boundary (implementation not preserved)
F3BC_ENTRYPOINT=scripts/e2e/verify-baseline.mjs / runBaselineCore (no command artifact)

F3AZ_F3BC_ENTRYPOINT_EQUIVALENCE=UNPROVEN
F3AZ_F3BC_CALL_PATH_EQUIVALENCE=UNPROVEN
F3AZ_F3BC_IMPORT_SURFACE_EQUIVALENCE=UNPROVEN
F3AZ_F3BC_NETWORK_CAPABILITY_SURFACE_EQUIVALENCE=UNPROVEN

NETWORK_CODE_PRESENT=yes
NETWORK_CAPABLE_IMPORTS=@supabase/supabase-js,undici-via-passive-observer
DIRECT_NETWORK_OPERATIONS=REACHABLE_FROM_CURRENT_DIRECT_ENTRYPOINT
CURRENT_REMOTE_CAPABILITY=UNPROVEN_FOR_AUTHORIZED_SAFE_PATH
EMPTY_ITEMS_ORIGIN=F3AZ_FAIL_CLOSED_SYNTHETIC_READ_RESULT
EMPTY_ITEMS_REQUIRES_REMOTE_ATTEMPT=UNPROVEN
```

The current source has `createClient(env.url, env.serviceKey)` and multiple
`client.from(...).select(...)` operations. The report-only assertion that F3AZ
used a fail-closed fetch boundary cannot prove that those operations are
unreachable without the missing boundary artifact.

## Readiness

```text
F3AZ_SAFE_ENTRYPOINT_REUSABLE=UNPROVEN
F3AZ_SAFE_ENTRYPOINT_REUSE_REQUIRES_CODE_CHANGE=UNPROVEN
LOCAL_VERIFIER_READINESS=NOT_READY_REMOTE_UNPROVEN
FUTURE_ONE_LOCAL_VERIFIER_EXECUTION_JUSTIFIED=UNPROVEN
```

The proof failure is classified as `DOCUMENTATION_GAP` with `HIGH`
confidence. A future phase would need an explicitly preserved, static
fail-closed read boundary and its exact launcher before dynamic validation.
