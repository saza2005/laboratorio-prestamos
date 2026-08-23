# FLOW-R2 - Preparation audit

## Business path
Dashboard de solicitudes, reviewer admin/lab_staff, `rejectRequestWithState`, `persistRejectRequest` y RPC `reject_request_transaction`.

## Pre-state
Request individual pending dedicada, un item bulk quantity 1, owner student y sin préstamos/devoluciones.

## Seed strategy
Strategy A, RPC real de creación con actor student, porque conserva defaults y validaciones del flujo. Seed planificado: una request y un request_item.

## Reject delta
Solo update de requests: pending a rejected, reviewer en approved_by, approved_at y rejection_reason. No audit_logs, inventory, movements, loans, returns ni maintenance.

## UI
Ruta `/dashboard/solicitudes`; filtro y fila; drawer; textarea `rejection_reason`; botón exacto `Rechazar`. Confirmación fuera del helper.

## Helper
`prepareFlowR2RejectAction` es compartido entre contrato READ_ONLY y test mutante. El contrato ejecutado pasó 1/1 sin confirmación.

## Verifier
`verify-mutating-flow.mjs` permite FLOW-R2 `pre`, `seeded`, `delta` y `post-cleanup` en allowlist; los stages posteriores requieren fixture y no se ejecutaron.

## Cleanup
Diseñado para ID exacto y children exactos, statuses pending/rejected, sin asociaciones. No se ejecutó.

## Recovery
Marker durable antes de seed, ID retornado por RPC, resolver exacto y bloqueo ante cero/múltiples matches o asociaciones inesperadas.

## Runner
Runner dry-run/list selecciona exactamente `request-reject.spec.ts`, chromium-admin, 1 test y 0 auth dependencies. Execute R2 permanece bloqueado.

## Destructive audit
No TRUNCATE, delete global, delete por namespace/status, última request ni IDs CLI arbitrarios introducidos por esta preparación.

## R1 regression protection
R1 pre y dry-run siguen PASS; `UNTRACKED_WRITE_WINDOW` permanece 0; no se ejecutó R1.
