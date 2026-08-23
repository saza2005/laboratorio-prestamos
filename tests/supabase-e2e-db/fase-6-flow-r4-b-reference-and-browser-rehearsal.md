# FLOW-R4-B - Reference review and browser rehearsal

## Result

The READ_ONLY reference and preflight checks passed, but browser execution was stopped before Playwright startup because the current grouped-request UI cannot assign the required deterministic R4 namespace to `group_name`.

`RequestFormGroups` initializes the group label to `Grupo 1` and renders it as a controlled hidden input. There is no editable group-name control or state update for that field. Mutating the hidden DOM value from a helper would not update the React state and would not be a reliable business payload contract.

The purpose/comments fields can carry a namespace, but this authorization explicitly requires the group-name namespace strategy for exact post-create identification. Adding or changing that business UI is outside this READ_ONLY rehearsal and is prohibited here.

## Completed READ_ONLY work

- Reference student: deterministic controlled E2E profile alias, role student, active.
- Reference item: deterministic `E2E_ITEM_BULK` alias, active bulk item, sufficient for quantity `1`, reference-only.
- Namespace collision PRE check: PASS; R4 namespace requests/groups: `0`.
- R4 verifier PRE: PASS; remote writes: `0`.
- Cleanup dry-run: PASS; exact planned order `request_group_items -> request_groups -> request_items -> requests`; real cleanup `0`.
- Local TypeScript, Node, directed ESLint, R4 contract, R3 regressions, classifier, completion, lifecycle, handshake, ACTION_DONE, and clean-state tests: PASS.
- Hardened remote preflight: baseline/storageState/clean-state PASS, hashes MATCH, residual mutating `0`, state CLEAN.

## Runtime not consumed

- Playwright: `0`
- Chromium: `0`
- Browser ready: `0`
- Submit clicks: `0`
- Server Action/RPC: `0`
- Remote writes: `0`
- Cleanup: `0`

`R4_REFERENCE_AND_BROWSER_REHEARSAL_STATUS=BLOCKED_BY_UI_CONTRACT`

`R4_DESIGN_AND_PREPARATION_STATUS=CLOSED`

`FLOW_R4_OFFICIAL_STATUS=OPEN`

Next safe step: resolve the group-name identity contract in a separately authorized local business-UI design change, then request a new READ_ONLY browser rehearsal authorization. No R4 mutation was executed.

## B1 status correction

The original B result remains `BLOCKED_BY_UI_CONTRACT` and is not rewritten. B1 demonstrated that the blocker can be resolved without a UI/business change: `purpose` provides the durable run marker, while the hidden controlled `group_name=Grupo 1` is validated inside the exact relational signature. The future recovery uses a durable PRE teacher snapshot and set difference with strict cardinality and child-relation checks.

`R4_POST_CREATE_IDENTITY_CONTRACT_STATUS=CLOSED`

The browser rehearsal itself remains deferred and was not rerun in B1.

## B2 closure

B2 is the separately authorized revised browser rehearsal. It used one teacher browser and the PRE-snapshot identity contract. The browser reached `/solicitudes/grupal`, prepared a valid one-group payload, and resolved the unique enabled submit without clicking it. No POST, Server Action, RPC, request row, group row, cleanup, or remote write occurred. The request set after the rehearsal equaled the persisted PRE set.

`R4_REFERENCE_AND_BROWSER_REHEARSAL_STATUS=CLOSED`
