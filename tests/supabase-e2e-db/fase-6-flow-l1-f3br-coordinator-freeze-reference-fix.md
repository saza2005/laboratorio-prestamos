# F3BR - single-process coordinator freeze reference fix

Phase: `F3BR`
Mode: `HARNESS_FIX_ONLY_NO_REMOTE_EXECUTION`

## Change

Only `scripts/e2e/verify-mutating-l1-single-process-preflight.mjs` changed.
`checkFreeze()` now uses the active reference
`POST_F3BL_AMENDED_FREEZE`. The existing historical manifest is retained only
as a carrier for non-exempt hash entries; the authorized post-F3BL hash for
`scripts/e2e/verify-baseline.mjs` is checked explicitly. No runtime file or
freeze hash was regenerated.

The core APIs, call graph, stage gating, L1 PRE query contract, retry policy,
transport observability, host comparator, and environment provenance are
unchanged.

## Static validation

```text
COORDINATOR_SYNTAX_VALIDATION=PASS
FREEZE_GATE_STATIC_VALIDATION=PASS
POST_F3BL_REFERENCE_STATIC_VALIDATION=PASS
OLD_POST_F3AD_ACTIVE_REFERENCE_PRESENT=no
BASELINE_CORE_API_CHANGED=no
CLEAN_STATE_CORE_API_CHANGED=no
L1_PRE_CORE_API_CHANGED=no
STAGE_GATING_CHANGED=no
L1_PRE_QUERY_CONTRACT_CHANGED=no
RETRY_POLICY_CHANGED=no
NETWORK_STACK_CHANGED=no
ENV_LOADING_CHANGED=no
```

## References

```text
COORDINATOR_PRE_FIX_HASH=81d8f07f4c08bc549e1f3c7f299d16359c8cd203ab869f06aba57253ac60d6af
POST_F3BR_COORDINATOR_HASH=8d5b4b1ea66a7d6874b4179d2cf357928d2cd4e2ef25151f4813818361e2efe7
POST_F3BR_COORDINATOR_REFERENCE=POST_F3BR_COORDINATOR_REFERENCE
RUNTIME_VERIFY_BASELINE_HASH=af9edb8cee87057cbcfeb2e48fafd673da77705f3847fa28ab834a7feab8cec1
WRAPPER_HASH=45a591a673f6be33a373b118093463b8021ed72647c3046660e1dca088d4475c
```

## Readiness and safety

```text
PRE_READ_REMOTE_READINESS=READY_FOR_ONE_SINGLE_PROCESS_READ_ONLY_PREFLIGHT
FUTURE_REMOTE_EXECUTION_FORENSICALLY_JUSTIFIED=yes
REMOTE_EXECUTIONS=0
REMOTE_READS=0
REMOTE_WRITES=0
BASELINE_REMOTE_EXECUTIONS=0
CLEAN_STATE_REMOTE_EXECUTIONS=0
L1_PRE_EXECUTIONS=0
```

No coordinator, baseline, clean-state, L1 PRE, DNS, fetch, Supabase,
browser, or Playwright execution occurred.
