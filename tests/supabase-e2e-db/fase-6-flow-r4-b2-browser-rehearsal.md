# FLOW-R4-B2 - Revised browser rehearsal

## Scope and authorization

This was one authorized `chromium-teacher` browser run using `teacher.json`. It was limited to client-side preparation. The grouped-create submit was explicitly not authorized.

## Result

The fresh READ_ONLY preflight passed: baseline, storageState, clean-state, and R4 PRE verifier all PASS; hashes MATCH; residual mutating `0`; state CLEAN. Reference validation passed for the controlled E2E teacher, student, and `E2E_ITEM_BULK` item. The item is persisted as `consumable`, which is the repository's bulk-compatible item class.

The browser reached `/solicitudes/grupal` with one grouped form and teacher permission. The helper set the editable `purpose` run marker, selected exactly one E2E student leader, selected exactly one E2E bulk-compatible item, set quantity `1`, and verified the FormData contract:

- `p_items=[]`
- one group with `group_name=Grupo 1`
- one exact leader
- one exact item with quantity `1`

The submit control `Enviar solicitud con grupos` was unique, visible, and enabled. It was not clicked. No Enter, `requestSubmit`, or `form.submit` path exists in the helper. The page POST kill-switch was installed before navigation and recorded zero POST attempts.

The teacher request-ID set remained equal to the PRE snapshot: current count `1`, current-run delta `0`. Postflight passed and no process remained.

The canonical no-write handshake was validated locally as:

`BROWSER_STARTING -> BROWSER_READY -> HANDOFF_DRY_RUN -> ACTION_ARMED_DRY_RUN -> CANCEL -> CLEAN`

It had zero invalid transitions and one terminal handshake. The browser spec itself never published `ACTION_GO`, `ACTION_RUNNING`, or `ACTION_DONE`.

## Accounting

```text
R4_B2_BROWSER_RUNS=1
R4_B2_SUBMIT_CLICKS=0
R4_B2_BUSINESS_EXECUTIONS=0
R4_B2_BUSINESS_RPC_EXECUTIONS=0
R4_B2_REMOTE_WRITES=0
R4_B2_CLEANUP_EXECUTIONS=0
R4_ACTION_GATES_WOULD_PASS=yes
R4_ACTION_GO_COUNT=0
R4_ACTION_DONE_COUNT=0
STATE=CLEAN
```

`R4_REFERENCE_AND_BROWSER_REHEARSAL_STATUS=CLOSED`

Next safe step: obtain explicit authorization for the R4 grouped-create Server Action boundary diagnostic. This rehearsal did not create a grouped request.

The subsequent C diagnostic is documented separately and does not alter the B2 result.

The later R4-REAL-1 result is documented separately. This B2 rehearsal remains a no-submit, no-write historical result.
