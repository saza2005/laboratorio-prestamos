# FASE 6.3B-L1-F3H

## Scope

F3H performed only local environment inspection and the authorized read-only DNS diagnostics. No L1 PRE execution, browser, fixture, mutation, business RPC, cleanup, or network configuration change occurred.

## Environment

The configured target was structurally validated as the E2E Supabase project: URL present and parseable, HTTPS scheme, host present, expected project identity matching, and normal-project reachability `0`. No proxy environment variables were present. No custom fetch, proxy agent, dispatcher override, or DNS lookup override was found in the examined runtime path. Node uses `verbatim` DNS result order. The host resolver model is NSS with a systemd-style `resolv.conf` symlink, one configured resolver, and a search-domain entry.

## Diagnostic limitation

The authorized Node DNS diagnostic executed the control lookup, E2E lookup, OS lookup, and direct resolver calls, but the reporting process then failed with a permission error while inspecting `/proc/1/ns/net`. Consequently the DNS result values were not emitted and must be treated as `NOT_CAPTURED`; they are not inferred from F3G.

The current DNS scope and root cause therefore remain `INSUFFICIENT_EVIDENCE`. F3G's historical DNS failure remains preserved and is not rewritten.

## Status

```text
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
L1_F3H_NETWORK_CONFIGURATION_CHANGED=no
L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_INITIAL_DELIVERY_CLICK
FLOW_L1_OFFICIAL_STATUS=OPEN
BASELINE_RESTORED=yes
STATE=CLEAN
```

Next safe step: authorize a fresh read-only F3H diagnostic with reporting that does not inspect restricted process-namespace metadata, or remediate the demonstrated DNS/environment issue if independently confirmed.

## F3H-R2 result

F3H-R2 used incremental sanitized persistence and did not inspect restricted namespace metadata. The E2E target identity passed. The control Node/NSS lookups passed; the E2E Node/NSS lookups passed; E2E `resolve4` passed. E2E `resolve6` returned no data, which does not block DNS health because normal lookup and IPv4 resolution passed. No resolver CLI was available.

Current DNS lookups are healthy. Combined with the preserved historical DNS failures, the current environment is classified as `INTERMITTENT_DNS_RESOLUTION_FAILURE` with medium confidence. No network configuration changed and no L1 PRE ran.

F3I subsequently reproduced the DNS failure in the application read path despite the healthy F3H-R2 resolver diagnostics. This preserves the higher-level classification as intermittent or path-specific runtime DNS behavior; no network remediation was attempted.

## F3J result

The same-process differential passed at all three layers: Node lookup, TLS hostname connection, and origin fetch. Passive Undici diagnostics matched the E2E target and observed no connect error. Current network health is therefore confirmed, while F3G/F3I remain preserved as intermittent historical failures.

F3L's canonical requests path also passed on its first attempt. No DNS failure host comparison or post-failure lookup was needed in that execution.
