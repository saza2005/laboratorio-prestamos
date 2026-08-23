# FLOW-R3 REAL-1A - Initial versus confirmation locator forensic

## Preserved evidence

- Error context: available.
- Screenshot: available.
- DOM snapshot: available inside `error-context.md`.
- Separate runner/handshake logs: not preserved as separate files.
- First failure: `tests/e2e/mutating/request-approve.browser-armed.spec.ts:136`.
- Last successful gate: confirmation dialog and real confirm count `1`.
- First failed gate: post-dialog initial-control identity resolution, before `ACTION_ARMED`.

## Locator contracts

Initial control:

- scope: the single request approval form containing `request_item_id`;
- selector class: semantic role button;
- accessible filter: `/^Aprobar(?: solicitud completa)?$/i`;
- count before initial click: `1`.

Final confirmation:

- scope: `role=dialog`, accessible name `Aprobar solicitud`;
- inner control: exact role button name `Aprobar`;
- expected count: `1`;
- global final locator: none;
- `first/last/nth`: none.

## Root cause

Playwright locators are lazy. REAL-1 retained the initial locator and re-resolved it after opening the dialog. The preserved DOM snapshot shows the Detail surface and approval form still present, plus the dialog confirm. The broad form-derived locator consequently matched two elements. This is a harness-only `LAZY_LOCATOR_REEVALUATION_DEFECT` with a `BROAD_FORM_SCOPE_DEFECT`; it is not an application UI regression.

S2/S3/S3C resolved the initial control uniquely before the click and resolved the final control inside the named dialog. REAL-1 added the post-dialog re-query for the initial handle, so the methods were not semantically equivalent.

## Minimal fix

`request-approve-action.ts` now captures `initialElementHandle` immediately after the initial locator passes its unique/visible/enabled checks and before the initial click. REAL-1 compares that preserved handle with the exact dialog-scoped confirm handle. The broad initial locator is not re-evaluated after dialog open.

No `first()`, `last()`, or `nth()` workaround was added. Uniqueness and distinct-element checks remain mandatory. False `ACTION_ARMED` reachability remains `0` when any gate fails.

## Tests

- Local REAL-1 reproduction: yes.
- Hotfix test: PASS.
- Unique distinct controls: PASS.
- Ambiguous initial/confirm, same element, and missing dialog: fail closed, PASS.
- TypeScript, Node, directed ESLint, classifier/replay, completion, handshake, lifecycle, ACTION_DONE, tracking, seed, verifier, and cleanup contracts: PASS.
- Remote READ_ONLY baseline/storageState/clean-state: PASS; hashes MATCH; residuals `0`; state CLEAN.

## Invariants unchanged

Request classifier, sanitized capture, single Server Action allow-gate, completion coordinator, response semantics, DB classification, ACTION_DONE gate, seed, cleanup, and business code were unchanged by this forensic fix.

`R3_REAL1_LOCATOR_FORENSIC_STATUS=CLOSED`

`FLOW_R3_REAL_ATTEMPT_1_STATUS=FAIL_BEFORE_APPROVAL`

`FLOW_R3_OFFICIAL_STATUS=OPEN`

Next safe step: explicit authorization for one READ_ONLY runtime validation of the corrected locator path. No REAL-1 attempt #2 is executed here.

## REAL-1B attempt

The corrected locator runtime was not consumed. Local freeze/tests and the port gate passed, but the single permitted remote preflight failed at clean-state with `clean_state_read_failed`; baseline and storageState passed. The phase therefore stopped before Playwright and before seed, exactly as required. No locator change was made after observing runtime traffic, and no retry occurred.
