# FLOW-R3 S2A - Browser-ready gate forensic

## S2 evidence

The preserved Playwright artifact was `test-results/.../error-context.md` plus the failure screenshot. The browser reached `/dashboard/solicitudes` and rendered the protected request list and search textbox. The first failure was the additional `getByText('Rol: Administrador', { exact: true })` assertion before `BROWSER_READY`.

## Root cause

`Rol: Administrador` is rendered by `app/dashboard/page.tsx`, whose route is `/dashboard`. The R3 browser path is `/dashboard/solicitudes`, where the canonical protected-surface control is the request search textbox. The failure is classified as `WRONG_UI_SURFACE_ASSERTION` and `REDUNDANT_NON_CANONICAL_ASSERTION`; it is not evidence of an expired admin session or auth regression.

## Harness correction

The R3 readiness gate now requires the protected URL and request search control. It does not require dashboard role text. The application, Supabase project, RPCs, RLS, auth configuration, and storageState were unchanged. A local regression test rejects reintroduction of the stale role assertion.

The same coordinator has an explicit READ_ONLY mode. After readiness it uses the canonical dry-run handshake closure and has no seed, fixture, business action, or cleanup path.

## Validation

- TypeScript, Node checks, directed ESLint, readiness regression, and existing handshake/state/lifecycle tests: PASS.
- Preflight: baseline PASS, storageState PASS, clean-state PASS, hashes MATCH.
- One S2A READ_ONLY browser run: one Playwright, one Chromium, no second browser, admin reauth `0`, no seed, no writes; `BROWSER_READY_COUNT=1` was observed.
- That run initially failed only at the coordinator's non-canonical direct `BROWSER_READY -> CANCEL` close. The closure was corrected locally to use the existing dry-run transition chain. No second browser run was performed.
- Postflight: baseline PASS, storageState PASS, clean-state PASS, hashes MATCH, residual mutating `0`.

## Status

`ROOT_CAUSE_DEMONSTRATED=yes`

`BUSINESS_CODE_CHANGED=no`

`R3_BROWSER_READY_GATE_STATUS=INCOMPLETE`: readiness was observed, but the one authorized runtime did not complete the terminal roundtrip before the local closure correction. A new explicit READ_ONLY runtime authorization is required before authorizing any real R3 seed.

`R3_REAL_SEED_AND_UI_REHEARSAL_STATUS=INCOMPLETE`

## R3-S2 seeded rehearsal result

The authorized S2 run passed browser readiness, executed one R3 seed, verified the seeded fixture, and continued in the same Chromium. The approval initial control was clicked once to open the confirmation dialog; the final approval control was located but never clicked. Page POSTs after the initial click, approval RPCs, and approval updates were zero.

Exact cleanup deleted one request item and one request. A post-cleanup verifier ordering defect was fixed after the write; the corrected read-only verifier passed without repeating cleanup. Final baseline, storageState, clean-state, hashes, and residual checks passed.

`R3_REAL_SEED_AND_UI_REHEARSAL_STATUS=CLOSED`

`FLOW_R3_OFFICIAL_STATUS=OPEN`

## S2B closure attempt

Static canonical sequence validation passed, including rejection of direct `BROWSER_READY -> CANCEL`. The S2B entrypoint was changed to the R3 runner `run-playwright-mutating-r3.mjs` in explicit READ_ONLY mode. Its one authorized runtime could not launch because port `3000` was already occupied by a pre-existing Next process. No browser, seed, RPC, cleanup, or remote write occurred. The process and handshake residue were explicitly cleaned; preflight and postflight remained PASS with `STATE=CLEAN`.

`R3_BROWSER_READY_GATE_STATUS=INCOMPLETE`

## S2B final runtime validation

The port gate initially found an orphaned E2E `start-app-e2e`/Next process. Its ownership and origin were demonstrated before it was stopped. Port `3000` was then free.

The one authorized S2B runtime used the real R3 runner and passed: one Playwright, one Chromium, `BROWSER_READY=1`, canonical dry-run handshake terminal `CLEAN`, no second browser, no reauth, page POSTs reaching Next `0`, no seed, no fixture, no business RPC, no cleanup, and no remote writes. Process and handshake cleanup passed. Final baseline, storageState, and clean-state verifiers passed with matching hashes and residuals `0`.

`R3_BROWSER_READY_GATE_STATUS=CLOSED`
`R3_REAL_SEED_AND_UI_REHEARSAL_STATUS=INCOMPLETE`
