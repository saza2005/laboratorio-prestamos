# FLOW-L1 - Design and preparation result

## FASE 6.3B-L1-F3E result

Installed PostgREST-js fetch-rejection normalization was confirmed locally. The one canonical tap observation returned HTTP 2xx and array data; the subsequent complete verifier without the tap failed. The exact failing fetch origin remains insufficiently evidenced, so final preflight was not run.

## FASE 6.3B-L1-F3D result

The canonical requests probe reused production `readTable` and reproduced `SUPABASE_RESULT_ERROR_OBJECT` in one attempt. Per stop rule, loans, complete verifier, and final preflight were not run.

## FASE 6.3B-L1-F3C result

Narrow requests and loans probes passed individually. The complete verifier uses the same logical queries and retry helper but performs sequential reads through `readTable`; its first boundary resolved successfully at promise level with `data=null` and a structured Supabase result error exposing safe field names `code`, `details`, `hint`, and `message`. It failed closed before loans. The discrepancy is classified as `SUPABASE_RESULT_ERROR_OBJECT`, nonretryable. The one complete diagnostic failed, so final preflight was not run.

The current repository defines L1 as approved-request delivery and L2 as direct loan creation. The inventory and current code agree; no definition conflict was found.

The L1 contract, historical Batch C failure classification, dedicated fixture plan, exact business delta, restoration model, recovery rules, UI contract, and reusable R4 infrastructure are documented in `fase-6-flow-l1-design-and-preparation.md`. The historical failure remains separate in `fase-6-flow-l1-historical-delivery-failure-forensic.md`.

No fixture was created, no approval was executed, no delivery RPC was invoked, no direct-loan RPC was invoked, no browser ran, and no cleanup ran in this phase.

`L1_DESIGN_AND_PREPARATION_STATUS=CLOSED`

## FASE 6.3B-L1-F3AI result

F3AI audited the F3AH factor matrix and found the four factor runs were not
true single differentials because they shared a coordinator-prefix harness
condition. No new factor matrix or pairwise experiment ran. In-process
inspector calibration passed; the one exact-prefix provenance execution
ended in a stale harness-field assertion before emitting a usable paused
event. No source site, symbol, import/cache cause, or environment-specific
cause was proven.

```text
L1_F3AI_F3AH_FACTOR_MATRIX_INTERPRETATION=CONFOUNDED_BY_COMMON_PREFIX
L1_F3AI_NEW_FACTOR_MATRIX_EXECUTIONS=0
L1_F3AI_PAIRWISE_COMBINATION_EXECUTIONS=0
L1_F3AI_INSPECTOR_MODE=IN_PROCESS_SESSION_ONLY
L1_F3AI_INSPECTOR_CAUGHT_EXCEPTION_CALIBRATION=PASS
L1_F3AI_EXACT_PREFIX_INSPECTOR_EXECUTIONS=1
L1_F3AI_RUNTIME_FIX_APPLIED=no
L1_F3AI_RUNTIME_FILES_CHANGED_COUNT=0
L1_F3AI_RUNTIME_FREEZE_CHANGED=no
L1_F3AI_POST_F3AD_FREEZE_REMAINS_VALID=yes
L1_F3AI_ROOT_CAUSE_CLASS=THROW_EVENT_CAPTURED_SITE_UNRESOLVED
L1_F3AI_ROOT_CAUSE_CONFIDENCE=LOW
L1_F3AI_ENVIRONMENT_SPECIFIC_CAUSE_PROVEN=no
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
REMOTE_WRITES=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3AK result

F3AK proved that F3AJ required post-catch envelope fields before completing
pre-catch V8 provenance. The harness state machine now separates PRE_EVENT,
THROW_EVENT and POST_EVENT. Synthetic tests preserve throw evidence without
an envelope, correlate a delayed envelope, preserve evidence when the
envelope never arrives, and classify a no-throw path without
`HARNESS_FAILURE`. The target exact-prefix execution count remained zero.

```text
L1_F3AK_PROVENANCE_HARNESS_CONTRACT_STATUS=CLOSED
L1_F3AK_PRE_EVENT_ORDERING_DEFECT_PROVEN=yes
L1_F3AK_PRE_EVENT_ENVELOPE_DEPENDENCY_REACHABILITY=0
L1_F3AK_THROW_CAPTURE_INDEPENDENT_OF_ENVELOPE=yes
L1_F3AK_THROW_PROVENANCE_REQUIRES_ENVELOPE=no
L1_F3AK_HARNESS_PRECONDITION_FIX_APPLIED=yes
L1_F3AK_NO_ENVELOPE_PRE_EVENT_TEST=PASS
L1_F3AK_THROW_WITHOUT_ENVELOPE_CAPTURE_TEST=PASS
L1_F3AK_DELAYED_ENVELOPE_CORRELATION_TEST=PASS
L1_F3AK_THROW_CAPTURE_SURVIVES_MISSING_ENVELOPE_TEST=PASS
L1_F3AK_NO_THROW_HEALTHY_PATH_TEST=PASS
L1_F3AK_HARNESS_STATE_TRANSITION_TESTS=PASS
L1_F3AK_TARGET_REFERENCEERROR_EXACT_PREFIX_EXECUTIONS=0
L1_F3AK_RUNTIME_FILES_CHANGED_COUNT=0
L1_F3AK_RUNTIME_FREEZE_CHANGED=no
L1_F3AK_POST_F3AD_FREEZE_REMAINS_VALID=yes
L1_F3AK_ALL_RUNTIME_HASHES_MATCH=yes
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
REMOTE_WRITES=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3AJ result

F3AJ corrected one obsolete alias in the forensic inspector harness. The
synthetic canonical mapping and schema-drift guard passed. The one corrected
exact-prefix execution still aborted because the harness assumed an exception
envelope shape absent from that result. No target ReferenceError event or
throw site was therefore proven, and no runtime file or freeze changed.

```text
L1_F3AJ_F3AI_TARGET_THROW_EVENT_PROVENANCE=NOT_REACHED_DUE_TO_HARNESS_ABORT
L1_F3AJ_OBSOLETE_HARNESS_ALIAS_PROVEN=yes
L1_F3AJ_ALIAS_DEFECT_LAYER=FORENSIC_HARNESS
L1_F3AJ_ALIAS_EXISTS_IN_FROZEN_RUNTIME=no
L1_F3AJ_HARNESS_ALIAS_FIX_APPLIED=yes
L1_F3AJ_HARNESS_CANONICAL_MAPPING_TEST=PASS
L1_F3AJ_HARNESS_SCHEMA_DRIFT_GUARD=PASS
L1_F3AJ_EXACT_PREFIX_INSPECTOR_EXECUTIONS=1
L1_F3AJ_TARGET_REFERENCEERROR_EVENT_CAPTURED=no
L1_F3AJ_EXACT_PREFIX_RESULT=HARNESS_FAILURE
L1_F3AJ_RUNTIME_FIX_APPLIED=no
L1_F3AJ_RUNTIME_FILES_CHANGED_COUNT=0
L1_F3AJ_RUNTIME_FREEZE_CHANGED=no
L1_F3AJ_POST_F3AD_FREEZE_REMAINS_VALID=yes
L1_F3AJ_ROOT_CAUSE_CLASS=PROVENANCE_HARNESS_DEFECT_REMAINS
L1_F3AJ_ROOT_CAUSE_CONFIDENCE=HIGH
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
REMOTE_WRITES=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3AE result

Exactly one remote preflight ran against the F3AD freeze. Freeze,
isolation and storage passed. Baseline executed once and stopped before
read 1 at `OBSERVER_START` with `BASELINE_UNEXPECTED_LOCAL_EXCEPTION` and
safe fingerprint `ReferenceError`. Clean-state and L1 PRE were
`NOT_REACHED`; all budgets remained compliant. The F3AD formatter preserved
the structured envelope. No DNS conclusion, retry, browser or mutation is
authorized from this result.

```text
L1_F3AE_SINGLE_PROCESS_PREFLIGHT_RESULT=FAIL
L1_F3AE_FAILURE_CLASS=BASELINE_LOCAL_EXCEPTION
L1_F3AE_BASELINE_CURRENT_READ_ORDINAL=NOT_STARTED
L1_F3AE_BASELINE_READS_STARTED=0
L1_F3AE_BASELINE_READS_COMPLETED=0
L1_F3AE_BASELINE_HOST_CLASS=HOSTNAME_NOT_AVAILABLE
L1_F3AE_FORMATTER_CANONICAL_PROJECTION_VALID=yes
L1_F3AE_FORMATTER_PROJECTION_CONTRACT_BROKEN=no
REMOTE_WRITES=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3AG result

The exact coordinator prefix was executed once locally with real gates,
real default observer and network kill-switch. It reproduced the
`OBSERVER_START` ReferenceError before read 1, without network. The symbol
and source site remain unlocalized; no runtime change or new freeze was
made.

## FASE 6.3B-L1-F3AG result

F3AG reproduced the F3AE coordinator prefix locally with real gates,
real default observer and a pre-installed network kill-switch. The prefix
reached the read boundary and did not reproduce the remote ReferenceError.
No frozen runtime file changed, no network ran, and no new freeze was
created.

## FASE 6.3B-L1-F3AF result

The authorized F3AE result remains preserved. F3AF reproduced the real
observer construction locally with the network kill-switch, but could not
reproduce the remote `ReferenceError`; the observer started, stopped and
allowed a synthetic first read without network. No speculative runtime fix
was applied and no new freeze was created.

```text
L1_F3AF_OBSERVER_START_FIX_STATUS=CLOSED_NO_OBSERVER_FIX_REQUIRED
L1_F3AF_REFERENCE_ERROR_SITE_PROVEN=no
L1_F3AF_REFERENCE_ERROR_LOCAL_REPRODUCED=no
L1_F3AF_REPRO_USED_REAL_OBSERVER_START_PATH=yes
L1_F3AF_REMOTE_NETWORK_OPERATIONS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3AD result

F3AD reproduced the F3AC all-`UNKNOWN` display locally using a populated
F3AB envelope. The minimal coordinator/CLI projection fix now gives
canonical fields precedence over legacy aliases and preserves absent
fields as `UNKNOWN` without fabricating values. Full local regression and
the new freeze self-check passed. No remote operation occurred.

```text
L1_F3AD_FORMATTER_PROJECTION_STATUS=CLOSED
L1_F3AD_ROOT_CAUSE_CLASS=STALE_CLI_ALIAS_PROJECTION
L1_F3AD_ROOT_CAUSE_CONFIDENCE=HIGH
L1_F3AD_F3AC_RETROACTIVE_FAILURE_RECLASSIFICATION=no
L1_POST_F3AB_BASELINE_EXCEPTION_PATH_VALIDATED_FREEZE_STATUS=STALE
L1_F3AD_NEW_FREEZE_BASELINE=POST_F3AD_FORMATTER_PROJECTION_VALIDATED
REMOTE_READS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3AC result

Exactly one remote single-process preflight was executed against
`POST_F3AB_BASELINE_EXCEPTION_PATH_VALIDATED`. Freeze, isolation and
storage passed. Baseline executed once and failed; clean-state and L1 PRE
were `NOT_REACHED`, nested baseline and post-failure checks were zero, and
the protocol budget was compliant. The output formatter used legacy field
aliases and hid the F3AB exception envelope, so this run provides no new
DNS evidence. No browser, RPC, mutation, retry or second execution ran.

```text
L1_F3AC_SINGLE_PROCESS_PREFLIGHT_RESULT=FAIL
L1_F3AC_F3AB_ENVELOPE_CONTRACT_BROKEN=yes
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
FLOW_L1_OFFICIAL_STATUS=OPEN
FLOW_L2_OFFICIAL_STATUS=NOT_STARTED
BASELINE_RESTORED=yes
STATE=CLEAN
```

## FASE 6.3B-L1-F3AA

The sole authorized F3AA execution matched the F3Z freeze, ran baseline
once, and stopped on baseline failure. Clean-state and L1 PRE were
`NOT_REACHED`; nested baseline and post-failure checks were zero. The
runtime did not return structured baseline detail, so no DNS, HTTP, or
semantic classification is assigned. No browser, mutation, or write
occurred.

## FASE 6.3B-L1-F3AB

F3AB completed local baseline exception-path hardening. All synthetic
exception, propagation, redaction, budget, and stop-on-failure tests passed.
The new freeze is `POST_F3AB_BASELINE_EXCEPTION_PATH_VALIDATED`.

## FASE 6.3B-L1-F3Z

F3Z integrated passive baseline observability for 18 reads, retained
baseline `NO_RETRY`, fixed structured failure propagation, and corrected
downstream `NOT_REACHED` reporting. All local tests passed; no remote
operation, browser run, mutation, or write occurred.

```text
L1_F3Z_BASELINE_OBSERVABILITY_STATUS=CLOSED
L1_POST_F3W_SINGLE_PROCESS_CORES_VALIDATED_FREEZE_STATUS=STALE
L1_F3Z_NEW_FREEZE_BASELINE=POST_F3Z_BASELINE_OBSERVABILITY_VALIDATED
L1_F3Z_NEW_FREEZE_SELF_CHECK=PASS
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3X

The sole authorized single-process preflight execution matched the F3W
freeze, ran baseline once, and failed there. Clean-state and L1 PRE remained
at zero; nested baseline and post-failure remote checks remained zero.
Historical F3R/F3Q/F3S/F3T/F3U results and the preflight protocol deviation
are preserved. No browser, mutation, or write occurred.

## FASE 6.3B-L1-F3Y

F3Y was local-only. It preserved F3X and reinterpreted downstream process
comparisons as `NOT_REACHED`. The baseline call graph has 18 READ_ONLY
operations, but no persisted baseline failure artifact identifies which
operation failed. The coordinator discarded the failed structured baseline
result, so the root result is `COORDINATOR_FAILURE_CLASSIFICATION_DEFECT`
with high confidence; the underlying baseline category remains
`UNKNOWN_INSUFFICIENT_OBSERVABILITY`. No runtime file or freeze changed.

## FASE 6.3B-L1-F3V result

F3V was local-only. Current entrypoints are CLI-only with top-level effects;
clean-state nests baseline through a child process. A single-process design
is feasible but requires minimal verifier-core extraction. The synthetic
coordinator and all requested local regressions passed.

```text
L1_F3V_IMPLEMENTATION_CLASS=MINIMAL_VERIFIER_CORE_EXTRACTION_REQUIRED
L1_F3V_SINGLE_PROCESS_FEASIBLE=yes
L1_F3V_SINGLE_PROCESS_RECOMMENDED=yes
L1_F3V_FROZEN_RUNTIME_REFACTOR_REQUIRED=yes
L1_F3V_RUNTIME_FREEZE_CHANGED=no
L1_F3V_POST_F3O_FREEZE_REMAINS_VALID=yes
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3W result

The baseline, clean-state, and L1 PRE CLI entrypoints now expose reusable
non-exiting cores. The new coordinator runs them in one Node process with
exact counts `1/1/1`, no nested baseline, no child process, and no
post-failure remote check. Local validation passed; remote execution remains
unauthorized.

```text
L1_F3W_SINGLE_PROCESS_IMPLEMENTATION_STATUS=CLOSED
L1_POST_F3O_DNS_BACKOFF_VALIDATED_FREEZE_STATUS=STALE
L1_F3W_NEW_FREEZE_BASELINE=POST_F3W_SINGLE_PROCESS_CORES_VALIDATED
L1_F3W_NEW_FREEZE_SELF_CHECK=PASS
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3T result

F3T ran the standalone exact-launcher network differential only. Context
gates matched the verifier-equivalent launch. Control DNS, E2E DNS, control
HEAD, and E2E-origin HEAD all passed. The passive E2E host class was
`E2E_SUPABASE_HOST`; no unexpected mismatch, retry, table read, PostgREST
query, RPC, browser, or mutation occurred.

```text
L1_F3T_ROOT_CAUSE_CLASS=EXACT_LAUNCHER_NETWORK_CURRENTLY_HEALTHY
L1_F3T_ROOT_CAUSE_CONFIDENCE=MEDIUM
L1_F3T_POST_F3O_FREEZE_REMAINS_VALID=yes
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

Control note: an additional post-failure clean-state safety check confirmed
residual mutating `0` and `STATE=CLEAN`, but exceeded the authorized
clean-state verifier count (`2` total versus a limit of `1`). This protocol
deviation is preserved; no success or forensic closure is claimed.

## FASE 6.3B-L1-F3U result

F3U was local-only. The actual PostgREST builder was captured without network:
E2E host, GET method, auth/apikey presence, and no custom dispatcher. F3T and
L1 ultimately use the same global fetch/Undici path; baseline and clean-state
use the same Supabase factory. Processes are separate, so the result is
`PROCESS_BOUNDARY_WITH_INTERMITTENT_DNS` with medium confidence.

```text
L1_F3U_ROOT_CAUSE_CLASS=PROCESS_BOUNDARY_WITH_INTERMITTENT_DNS
L1_F3U_ROOT_CAUSE_CONFIDENCE=MEDIUM
L1_F3U_PREFLIGHT_PROTOCOL_ROOT_CLASS=NESTED_VERIFIER_BUDGET_UNDERSPECIFIED_PLUS_POST_FAILURE_EXECUTION
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3-FINAL-PREFLIGHT result

The final hardened READ_ONLY preflight ran exactly once. Baseline,
storageState, and clean-state passed with residual mutating `0`. The single
L1 PRE failed on requests after attempt 1 DNS, one 1000 ms DNS backoff, and
attempt 2 DNS. Both passive host comparisons matched `E2E_SUPABASE_HOST`;
loans was `NOT_REACHED`. No retry, browser, fixture, RPC, or write followed.

```text
L1_FINAL_HARDENED_PREFLIGHT_EXECUTIONS=1
PREFLIGHT_BASELINE=PASS
PREFLIGHT_STORAGE_STATE=PASS
STORAGE_STATE_HASHES=MATCH
PREFLIGHT_CLEAN_STATE=PASS
PREFLIGHT_L1_PRE=FAIL
FINAL_HARDENED_PREFLIGHT_RESULT=FAIL
L1_FINAL_DNS_FAILURE_AFTER_BACKOFF=yes
L1_FINAL_PRE_RELIABILITY_TARGETED_STAGE=FAIL
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN
L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN
STATE=CLEAN
```

## FASE 6.3B-L1-F3S result

F3S was local-only. The standalone fingerprint tool performed zero network operations. F3R and F3Q matched on network environment presence, target source, Node/DNS defaults, fetch class, security context, and main-process execution. The only difference was benign launcher `execArgv` representation; no material verifier context difference was found.

```text
L1_F3S_ROOT_CAUSE_CLASS=NO_VERIFIER_CONTEXT_DIFFERENCE_FOUND
L1_F3S_ROOT_CAUSE_CONFIDENCE=MEDIUM
L1_F3S_NETWORK_RELEVANT_CONTEXT_DIFFERENCE_COUNT=0
L1_F3S_SECURITY_CONTEXT_DIFFERENCE_COUNT=0
L1_F3S_RUNTIME_CONTEXT_DIFFERENCE_COUNT=1
L1_F3S_POST_F3O_FREEZE_REMAINS_VALID=yes
REMOTE_READS=0
SUPABASE_TABLE_READ_EXECUTIONS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3O result

F3O was local-only. The previous retry path had no intentional delay; the implementation now waits exactly `1000 ms` only after a DNS-classified attempt 1 failure and before the existing attempt 2. No third attempt, whole-verifier retry, DNS warm-up, query change, or business semantic change was introduced.

All backoff, retry-ordering, comparator, passive bridge, quantity, verifier, TypeScript, Node, directed ESLint, and R1-R4 regression tests passed. `POST_F3N_COMPARATOR_VALIDATED` is stale; the new sanitized freeze is `POST_F3O_DNS_BACKOFF_VALIDATED` and passed self-check.

```text
L1_F3O_DNS_BACKOFF_STATUS=CLOSED
L1_POST_F3N_COMPARATOR_VALIDATED_FREEZE_STATUS=STALE
L1_F3O_NEW_FREEZE_BASELINE=POST_F3O_DNS_BACKOFF_VALIDATED
L1_F3O_NEW_FREEZE_MANIFEST_CREATED=yes
L1_F3O_NEW_FREEZE_SELF_CHECK=PASS
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3R result

F3R matched `POST_F3O_DNS_BACKOFF_VALIDATED` and executed exactly one complete PRE. `requests` failed with `DNS_RESOLUTION_ERROR` on attempt 1, executed one 1000 ms backoff, and failed again with `DNS_RESOLUTION_ERROR` on attempt 2. Both passive host classifications were `E2E_SUPABASE_HOST`; `loans` was `NOT_REACHED`. No third attempt, additional diagnostic, or preflight ran.

```text
L1_F3R_COMPLETE_L1_PRE=FAIL
L1_F3R_TRANSIENT_FAILURE_COUNT=2
L1_F3R_TRANSIENT_RECOVERY_COUNT=1
L1_F3R_DNS_BACKOFF_COUNT=1
L1_F3R_DNS_FAILURE_AFTER_BACKOFF=yes
L1_F3R_NEXT_DIAGNOSTIC_CLASS=VERIFIER_EXECUTION_CONTEXT_DIFFERENTIAL
REMOTE_READS=1
L1_PRE_EXECUTIONS=1
STATE=CLEAN
```

## FASE 6.3B-L1-F3P result

The `POST_F3O_DNS_BACKOFF_VALIDATED` freeze matched. Exactly one complete PRE ran. `requests` attempt 1 failed with `DNS_RESOLUTION_ERROR` on `E2E_SUPABASE_HOST`; the implementation executed one `1000 ms` DNS-only backoff and then a fresh attempt 2, which also failed with `DNS_RESOLUTION_ERROR` on `E2E_SUPABASE_HOST`. `loans` was `NOT_REACHED`; no attempt 3 and no preflight occurred.

```text
L1_F3P_COMPLETE_L1_PRE=FAIL
L1_F3P_TRANSIENT_FAILURE_COUNT=2
L1_F3P_TRANSIENT_RECOVERY_COUNT=1
L1_F3P_DNS_BACKOFF_COUNT=1
L1_F3P_NONTRANSIENT_FAILURE_COUNT=0
L1_F3P_UNKNOWN_FAILURE_COUNT=0
L1_F3P_DNS_FAILURE_AFTER_BACKOFF=yes
L1_FINAL_PRE_RELIABILITY_TARGETED_STAGE=FAIL
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
REMOTE_READS=1
L1_PRE_EXECUTIONS=1
STATE=CLEAN
```

## FASE 6.3B-L1-F3Q result

F3Q was local read-only DNS diagnostics. The F3O harness freeze matched and no runtime code changed. `systemd-resolved` and NetworkManager were active. Node samples passed 5/5 for control and E2E; NSS samples passed 3/3 for both; `resolve4` passed 2/2. No current DNS failure was reproduced, no system remediation occurred, and no L1 PRE ran.

```text
L1_F3Q_ROOT_CAUSE_CLASS=CURRENT_SAMPLE_HEALTHY_WITH_HISTORICAL_INTERMITTENT_FAILURE
L1_F3Q_ROOT_CAUSE_CONFIDENCE=MEDIUM
L1_F3Q_RECOMMENDED_REMEDIATION_CLASS=NO_SYSTEM_CHANGE_YET
REMOTE_READS=0
SUPABASE_TABLE_READ_EXECUTIONS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3F result

The one authorized complete L1 PRE execution with the integrated transparent fetch tap failed on `L1_PRE_REQUESTS`. The underlying fetch was observed as rejected with a sanitized DNS-resolution fingerprint (`ENOTFOUND`/`GETADDRINFO`); installed `postgrest-js` normalized it to a fulfilled structured result with null data and no HTTP response status. `L1_PRE_LOANS` was not reached. Historical F3A-F3E outcomes remain unchanged.

`L1_COMPLETE_TRANSPORT_FORENSIC_STATUS=CLOSED`

`L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN`

## FASE 6.3B-L1-F3K result

The one targeted L1 PRE execution used the passive bridge without fetch replacement. Requests failed with DNS on attempts 1 and 2, one recovery was recorded, no third attempt occurred, and loans were not reached. No final preflight ran. Historical F3A-F3J outcomes remain unchanged.

`L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN`

No passive remote run or full preflight was authorized after the tapped complete failure. No browser, fixture, business RPC, cleanup, or remote write occurred; `STATE=CLEAN`.

## FASE 6.3B-L1-F3G result

The passive transport bridge was validated locally and correctly allowed one recovery only for positively observed approved transport classes. The single targeted remote complete L1 PRE observed DNS resolution failure on `L1_PRE_REQUESTS` twice. Recovery count was `1`, the final read failed, and `L1_PRE_LOANS` was not reached. Per stop rule, no final preflight ran.

`L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN`

`L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN`

`L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN`

No browser, fixture, mutation, business RPC, cleanup, or remote write occurred. Baseline remained CLEAN.

## FASE 6.3B-L1-F3H result

F3H validated the E2E target identity, HTTPS URL structure, proxy absence, and local resolver model without changing configuration. The authorized DNS lookup process failed during restricted network-namespace inspection before reporting the DNS results, so current DNS scope remains `INSUFFICIENT_EVIDENCE`. No L1 PRE or preflight ran.

`L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN`

`L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN`

`L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN`

Baseline remains CLEAN and all F3A-F3G history is preserved.

## FASE 6.3B-L1-F3H-R2 result

The corrected incremental DNS journal completed without namespace inspection. Control Node/NSS resolution passed. E2E Node/NSS resolution and IPv4 resolution passed. IPv6 returned `NO_DATA` and did not block health because IPv4 is available. No resolver CLI was installed. Current DNS lookups are healthy, while historical F3G failures remain preserved as evidence of intermittent DNS behavior.

No L1 PRE, browser, fixture, mutation, business RPC, cleanup, or preflight ran. `BASELINE_RESTORED=yes` and `STATE=CLEAN`.

## FASE 6.3B-L1-F3I result

The final targeted L1 PRE used the passive bridge without fetch replacement. Requests failed with `DNS_RESOLUTION_ERROR` on both permitted attempts; one recovery was recorded, no third attempt occurred, and loans were not reached. The final hardened preflight was not authorized after this failure.

`L1_FINAL_PRE_RELIABILITY_TARGETED_STAGE=FAIL`

`L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN`

`L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN`

No browser, fixture, mutation, business RPC, cleanup, or remote write occurred.

## FASE 6.3B-L1-F3J result

The same-process Node differential passed DNS lookup, TLS hostname connection, and origin-level fetch. Undici observed the target connection without error; the origin returned HTTP 4xx, which is acceptable for transport diagnostics. No table read or L1 PRE ran. Historical F3G/F3I DNS failures remain preserved.

## FASE 6.3B-L1-F3L result

The one canonical requests read passed on its first attempt using production `readTable` and the passive observer. No post-failure lookup, loans read, full L1 PRE, or preflight ran. Historical F3F-F3K failures remain unchanged.

## FASE 6.3B-L1-F3 result

F3 confirmed that the bulk quantity control is a visible, controlled `input type="number"` inside `DeliverForm`. The visible `Cantidad a entregar` text is rendered as a label without `htmlFor`; the input has no `id`, `name`, `aria-label`, or `aria-labelledby`, and is not wrapped by the label. The control is functional but has no accessible name under the current markup.

The R3 locator depended on that missing accessible name and was classified as `ACCESSIBLE_NAME_NOT_PRESENT`. The local helper now scopes the quantity input to the exact item card identified by `E2E_ITEM_BULK` and requires exactly one `input[type="number"]`. It uses no positional selector and fails closed for missing, ambiguous, wrong-type, and multi-item-unscoped controls. The application accessibility gap remains documented and unchanged.

Local F3 tests, TypeScript, directed ESLint, Node checks, L1 regressions, coordinator regressions, and zero-write dry-runs passed. Baseline, storageState, and clean-state remote read-only checks passed. The single authorized L1 PRE verification returned `l1_pre_read_failed`; a separate diagnostic read showed no query error, but the required verifier was not retried. Consequently F3 is not closed because the mandatory remote preflight gate is unresolved. No browser, fixture write, delivery action, RPC, cleanup, or remote write occurred in F3.

`L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN`

`L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_INITIAL_DELIVERY_CLICK`

## FASE 6.3B-L1-F3A result

The L1 PRE failure source was located. The previous verifier collapsed direct `requests`/`loans` read errors into `l1_pre_read_failed` without per-read diagnostics or bounded recovery. It now uses the existing read-only retry helper, with a maximum of one retry per read only for the approved DNS, connection-reset, connect-timeout, and read-timeout classes. Non-transient and unknown errors remain fail-closed.

The targeted remote probe failed on `L1_PRE_REQUESTS` with sanitized class `UNKNOWN_REMOTE_READ_ERROR` on attempt `1`. A later direct diagnostic read succeeded, but the unknown failure was not reclassified or retried. The complete preflight was correctly not run after the failed targeted probe. No browser, fixture write, business RPC, cleanup, or remote write occurred.

`L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN`

`L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN`

## FASE 6.3B-L1-F3B result

The read wrapper/classifier audit passed locally. Cause-chain and AggregateError inspection was added, safe error fingerprints redact sensitive data, and the approved retry classes were unchanged. Narrow `requests` and `loans` read probes passed individually. The complete L1 PRE verifier then failed again on `L1_PRE_REQUESTS` with an empty plain-object error and `UNKNOWN_REMOTE_READ_ERROR`. Since the native cause was not preserved, the historical classification remains `UNKNOWN` and the current root cause is `INSUFFICIENT_HISTORICAL_EVIDENCE` with a demonstrated diagnostic-information gap. The final complete preflight was not run.

`L1_PRE_READ_FAILURE_FORENSIC_STATUS=OPEN`

`L1_QUANTITY_CONTROL_FORENSIC_STATUS=OPEN`

## FASE 6.3B result

The single authorized lab-staff browser run started and the dedicated fixture was created and approved exactly once. The fixture was then removed by one exact-ID cleanup after the intermediate created-state verifier rejected the observed status contract. No delivery initial click, confirmation click, delivery Server Action, delivery RPC, loan write, stock mutation, or inventory movement occurred.

The post-cleanup verifier and hardened postflight passed: baseline, storageState, clean-state, and L1 PRE passed; storage hashes matched, residual mutating was `0`, and state was CLEAN. This phase is not closed because the rehearsal did not reach the delivery dialog.

`L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_DELIVERY_DIALOG`

`FLOW_L1_OFFICIAL_STATUS=OPEN`

The next step is READ_ONLY forensic analysis of the created-fixture status contract and harness sequencing. No delivery retry is authorized.

## FASE 6.3B-L1-F1 result

The preserved runner ordering is now understood: `prepare-l1-fixture.mjs` performed request creation and approval in the same invocation, and only afterwards did `run-flow-l1-b.mjs` invoke `--stage=created`. Therefore approval did not execute after a CREATED failure; the historical result was an ordering/naming defect in the local harness, not evidence of an application delivery failure.

The local fix separates `--stage=create` from `--stage=approve` and enforces `create -> CREATED PASS -> approve -> FIXTURE_READY`. CREATED and FIXTURE_READY signatures are now tested independently with fail-closed negative cases. No application, RPC, schema, auth, or RLS code changed.

`L1_CREATED_SIGNATURE_FORENSIC_STATUS=CLOSED`

The prior rehearsal remains preserved as `FAIL_BEFORE_DELIVERY_DIALOG`. A new mutating rehearsal still requires explicit authorization.

## FASE 6.3B-L1-R2 result

The corrected fixture order was demonstrated: request creation `1`, CREATED verifier `PASS`, approval `1`, and FIXTURE_READY verifier `PASS`. The same browser then failed before reaching the delivery form because the exact detail surface did not expose the expected `DeliverForm`. No initial delivery click, delivery POST, delivery RPC, loan, stock, or movement mutation occurred. Exact fixture cleanup ran once after the runner timeout.

Post-cleanup and hardened postflight passed with matching storage hashes, residual mutating `0`, and `STATE=CLEAN`. The rehearsal is not closed because the delivery dialog boundary was not reached. The runner timeout after child Playwright failure is preserved as a separate local coordinator issue; no hotfix or rerun was performed.

`L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_DELIVERY_FORM`

## FASE 6.3B-L1-F2 result

The R2 screenshot and current source establish that the approved lab-staff detail surface rendered the delivery form. The failure was the harness locator `form.filter({ has: detail.getByRole(...) })`, whose ancestor-scoped `has` locator did not match the actual descendant form. The application render contract is intact; the harness was corrected to resolve the unique form first and the submit control within it.

The coordinator was also corrected locally to race the expected `ACTION_ARMED` milestone against child Playwright termination, preventing a pre-arm failure from waiting for a timeout. No application code changed. Local UI/coordinator tests, regressions, dry-runs, and remote READ_ONLY preflight passed.

`L1_DELIVERFORM_COORDINATOR_FORENSIC_STATUS=CLOSED`

The historical R2 result remains `FAIL_BEFORE_DELIVERY_FORM`; no browser or fixture rerun occurred in F2.

## FASE 6.3B-L1-R3 result

R3 confirmed the corrected form locator and reached `DeliverForm`, but stopped before the initial delivery click because the quantity input has no accessible-name association with the visible `Cantidad a entregar` label. The harness locator `getByRole('spinbutton', { name: 'Cantidad a entregar' })` therefore resolved zero controls. No delivery click, POST, Server Action, RPC, loan, stock, or movement mutation occurred.

The corrected coordinator detected the child failure immediately and executed one exact fixture cleanup. Post-cleanup and hardened postflight passed with hashes matching, residual mutating `0`, and `STATE=CLEAN`.

`L1_FIXTURE_AND_BROWSER_REHEARSAL_STATUS=FAIL_BEFORE_INITIAL_DELIVERY_CLICK`

No hotfix or rerun was performed.

`FLOW_L1_OFFICIAL_STATUS=OPEN`

`FLOW_L2_OFFICIAL_STATUS=NOT_STARTED`

`FLOW_R4_OFFICIAL_STATUS=CLOSED`

The next step requires explicit authorization for dedicated L1 fixture preparation and browser-ready rehearsal. This phase does not authorize delivery or direct loan creation.

## Final preparation gates

Local L1 contract, recovery, verifier, cleanup dry-run, helper, TypeScript, Node, and directed ESLint checks passed. R1/R2/R3/R4 read-only regressions, request classifier, handshake, lifecycle, completion, ACTION_DONE, and clean-state reliability tests passed.

The single final remote READ_ONLY preflight passed: L1 verifier PRE, baseline, storageState, and hardened clean-state all passed; storage hashes remained MATCH, residual mutating was `0`, and state was CLEAN. The final clean-state diagnostics reported transient recovery `0`, non-transient failures `0`, and unknown failures `0`. No browser, fixture write, business RPC, cleanup, or remote write occurred.

## FASE 6.3B-L1-F3M-FR1 result

The post-F3L freeze rebase passed locally. Production read defaults remain two attempts; F3L's one-attempt diagnostic override is isolated. Query descriptors, success criteria, business invariants, and retryable classes are unchanged. A sanitized ignored freeze manifest was created with four runtime-critical file hashes.

No remote read, DNS query, browser, fixture, mutation, business RPC, or preflight ran. `STATE=CLEAN`.

## FASE 6.3B-L1-F3M-R2 result

The `POST_F3L_VALIDATED` freeze matched. The single complete L1 PRE failed with DNS on requests attempts 1 and 2; one recovery was recorded, no third attempt occurred, and loans was not reached. Passive Undici reported hostname `MISMATCH` against the expected E2E target. No final preflight ran.

## FASE 6.3B-L1-F3N result

F3N was local-only. It audited all effective URL provenance without printing values and used a no-network fetch capture to prove that the production client and canonical `requests` builder use the same E2E host. The PRE verifier has one client and no concurrent auxiliary network operation.

The historical F3M-R2 `MISMATCH` was caused by the verifier constructing the passive observer without passing `passiveTargetHost`; the comparator therefore compared against an empty target. The result remains preserved as historical comparator output, but it does not prove a different network destination. The verifier now passes the parsed effective target host.

```text
L1_F3N_ROOT_CAUSE_CLASS=HOST_COMPARATOR_DEFECT
L1_F3N_ROOT_CAUSE_CONFIDENCE=HIGH
L1_F3N_FREEZE_INVALIDATED_BY_CHANGES=yes
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
DNS_QUERY_EXECUTIONS=0
HTTP_EXECUTIONS=0
TLS_EXECUTIONS=0
STATE=CLEAN
```

## FASE 6.3B-L1-F3M-R3 result

The `POST_F3N_COMPARATOR_VALIDATED` manifest matched. Exactly one complete L1 PRE ran with the corrected passive observer and no fetch wrapper. `requests` attempt 1 and attempt 2 were both `DNS_RESOLUTION_ERROR`; the internal recovery was allowed once, both host classes were `E2E_SUPABASE_HOST`, and both PostgREST boundaries were fulfilled structured result errors with nullish data and no HTTP response. `loans` was `NOT_REACHED`. No third attempt and no preflight occurred.

```text
L1_F3M_R3_COMPLETE_L1_PRE=FAIL
L1_F3M_R3_TRANSIENT_FAILURE_COUNT=2
L1_F3M_R3_TRANSIENT_RECOVERY_COUNT=1
L1_F3M_R3_NONTRANSIENT_FAILURE_COUNT=0
L1_F3M_R3_UNKNOWN_FAILURE_COUNT=0
L1_F3M_R3_UNEXPECTED_HOST_MISMATCH=no
L1_FINAL_PRE_RELIABILITY_TARGETED_STAGE=FAIL
L1_FINAL_PRE_RELIABILITY_VALIDATION_STATUS=OPEN
REMOTE_READS=1
L1_PRE_EXECUTIONS=1
STATE=CLEAN
```

The prior `POST_F3L_VALIDATED` manifest was not replaced. A new local freeze rebase and separately authorized F3M remote execution are required.

## FASE 6.3B-L1-F3N-FR2 result

The comparator correction passed the full local suite. The verifier derives the effective production URL once and passes it explicitly to the production client factory and passive observer. A missing expected target is now `EXPECTED_TARGET_MISSING`; true same-host and true different-host cases remain distinguishable. The old false mismatch was reproduced locally and eliminated by the corrected invocation.

Production attempts remain `2` per read, the retryable set is unchanged, query descriptors and invariants are unchanged, and the no-network request-host capture passed.

```text
L1_F3N_FREEZE_REBASE_STATUS=CLOSED
L1_POST_F3L_VALIDATED_FREEZE_STATUS=STALE
L1_F3N_NEW_FREEZE_BASELINE=POST_F3N_COMPARATOR_VALIDATED
L1_F3N_NEW_FREEZE_MANIFEST_CREATED=yes
L1_F3N_NEW_FREEZE_SELF_CHECK=PASS
REMOTE_READS=0
L1_PRE_EXECUTIONS=0
STATE=CLEAN
```

Fixture-preparation, cleanup, and runner dry-runs also passed with zero business RPC executions and zero remote writes.

`L1_DESIGN_AND_PREPARATION_STATUS=CLOSED`
