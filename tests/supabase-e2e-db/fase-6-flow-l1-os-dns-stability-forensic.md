# FASE 6.3B-L1-F3Q

## Scope

F3Q was local DNS read-only diagnostics only. It performed no Supabase table read, HTTP/TLS operation, L1 PRE, browser run, mutation, or remediation. The F3O harness freeze was verified unchanged.

## Resolver topology

The host uses a `systemd-resolved` symlink/stub model. `systemd-resolved` and NetworkManager were active. The hosts resolution rule and resolver model were recorded as sanitized classes only. Detailed resolved statistics were unavailable. Recent resolver logs were readable but contained no safe timeout, SERVFAIL, network-change, or resolver-error signal in the bounded window.

## Bounded stability samples

The Node sample executed five rounds, each resolving the control host and the E2E host once. The control passed 5/5 and the E2E host passed 5/5, with zero DNS or other failures. The NSS sample passed 3/3 for both control and E2E. `resolve4` passed 2/2. No addresses, hostnames, DNS server values, or private domains were output.

```text
L1_F3Q_NODE_SAMPLE_ROUNDS_EXECUTED=5
L1_F3Q_CONTROL_NODE_PASS_COUNT=5
L1_F3Q_CONTROL_NODE_FAIL_COUNT=0
L1_F3Q_E2E_NODE_PASS_COUNT=5
L1_F3Q_E2E_NODE_FAIL_COUNT=0
L1_F3Q_CONTROL_OS_PASS_COUNT=3
L1_F3Q_CONTROL_OS_FAIL_COUNT=0
L1_F3Q_E2E_OS_PASS_COUNT=3
L1_F3Q_E2E_OS_FAIL_COUNT=0
L1_F3Q_RESOLVE4_PASS_COUNT=2
L1_F3Q_RESOLVE4_FAIL_COUNT=0
```

## Classification

Both Node and NSS paths were healthy in the current sample, and the control and E2E targets behaved identically. This does not rewrite F3F, F3G, F3I, F3K, F3M-R3, or F3P. The correct current classification is `CURRENT_SAMPLE_HEALTHY_WITH_HISTORICAL_INTERMITTENT_FAILURE` with medium confidence.

No system change is recommended from this evidence. F3Q did not alter resolver configuration, caches, routes, VPN, proxy, or the L1 harness.

```text
L1_F3Q_ROOT_CAUSE_CLASS=CURRENT_SAMPLE_HEALTHY_WITH_HISTORICAL_INTERMITTENT_FAILURE
L1_F3Q_ROOT_CAUSE_CONFIDENCE=MEDIUM
L1_F3Q_RECOMMENDED_REMEDIATION_CLASS=NO_SYSTEM_CHANGE_YET
L1_F3Q_IPV6_ABSENCE_ROOT_CAUSE_SUPPORTED=no
REMOTE_READS=0
SUPABASE_TABLE_READ_EXECUTIONS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

Next safe step: separately authorize one final complete READ_ONLY L1 PRE against `POST_F3O_DNS_BACKOFF_VALIDATED`; do not run it inside F3Q.

## F3R result

The single authorized PRE reproduced the DNS failure after the bounded backoff: attempt 1 DNS, one 1000 ms backoff, and attempt 2 DNS on the E2E host. F3Q's healthy local resolver sample remains unchanged; no additional resolver probe or system remediation ran.

## F3S execution-context result

F3S compared the verifier-equivalent and F3Q launch contexts locally without network I/O. No network-, security-, or runtime-network-relevant difference was found. The only difference was benign `execArgv` representation.

## F3T exact-launcher result

The verifier-equivalent standalone diagnostic passed control DNS, E2E DNS,
control HEAD, and E2E-origin HEAD. No resolver or transport failure was
reproduced in this bounded sample; the historical F3R/F3P failures remain
preserved and no system change was made.

## Final hardened preflight result

The final preflight did not authorize another resolver probe. Its L1 PRE
again failed after two E2E-host DNS failures and one 1000 ms bounded backoff;
baseline, storageState, and clean-state remained PASS. No system remediation
was performed.

F3X did not reach L1 PRE. It stopped after one baseline-core failure; no
additional DNS diagnostic or post-failure remote check was executed.
