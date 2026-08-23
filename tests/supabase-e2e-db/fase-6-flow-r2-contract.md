# FLOW-R2 - Rechazo de solicitud efimera

## Rol
Reviewer `admin` recomendado; `lab_staff` también está autorizado por `canManageLoans`. La preparación READ_ONLY usa `chromium-admin`.

## Route
`/dashboard/solicitudes`.

## Required pre-state
Una solicitud individual dedicada, status `pending`, owner student válido, un request_item del item bulk con quantity_requested=1, sin grupos, loans, deliveries ni returns.

## Seed strategy
Strategy A: crear una solicitud efímera mediante el flujo real `create_request_transaction` con actor student. Es la opción más fiel a constraints, triggers y defaults; seed y reject se reportan por separado.

## Namespace
`E2E_MUT_REQ_R2_`. El marker debe persistirse en `requests.purpose` y el ID exacto del seed es la autoridad primaria.

## Fixture
Una request y un request_item dedicados; no se utilizan las cuatro requests baseline.

## UI state machine
Dashboard -> filtrar/seleccionar request pending -> abrir drawer -> formulario de rechazo -> READY_TO_REJECT. Solo el submit es mutante.

## Shared pre-action path
`tests/e2e/mutating/helpers/request-reject-action.ts` es compartido por el contrato READ_ONLY y el test mutante. No confirma rechazo.

## Two-step reject boundary
El submit inicial `Rechazar` solo abre la confirmacion y debe producir cero POST. El confirm real se resuelve exclusivamente dentro de `dialog[name="Rechazar solicitud"]`; el drawer permanece identificado como `dialog[name="Detalle"]`. No se permiten `first()`, `last()` ni `nth()` para desambiguar el confirm. El diagnostico READ_ONLY instala antes de navegar un kill-switch que aborta todo POST y exige observar exactamente un intento Server Action solo despues del confirm real.

## Server Action
`rejectRequestWithState` -> `persistRejectRequest`.

## RPC
`reject_request_transaction(p_request_id, p_rejection_reason)`.

## Seed delta
requests +1; request_items +1. Sin cambios en inventory, units, movements, loans, returns, maintenance ni audit_logs esperados.

## Reject delta
requests count sin cambio; request_items sin cambio; request.status `pending -> rejected`; `approved_by` reviewer; `approved_at` timestamp; `rejection_reason` motivo o fallback. `updated_at` cambia por trigger.

## Tables allowed
Seed futuro: requests y request_items mediante RPC real. Reject futuro: requests mediante RPC. Cleanup: request_items y requests exactos.

## Tables forbidden
items, item_units, inventory_movements, loans, loan_items, returns, return_items, maintenance_records, profiles, Auth y requests baseline.

## Side effects
La RPC inspeccionada no inserta audit_logs ni movimientos y no modifica inventario. El envío de email es un efecto externo de la Server Action y debe estar controlado/observado en la futura ejecución.

## State
FLOW-R2 registra seed request_id, request_item IDs, marker, owner, reviewer, estados y cleanup_required. Sin secretos.

## Recovery
Persistir correlation marker antes del seed; registrar ID retornado por create RPC; si falta, resolver por marker exacto + owner + status. Ambigüedad bloquea.

## Cleanup
Solo ID exacto, child exacto, marker, owner y status `pending` o `rejected`, sin asociaciones posteriores. Nunca por prefijo o status global.

## Artifacts
Video off; trace off inicialmente; screenshots solo ante fallo y no publicar artifacts sensibles.

## PASS
Seed exacto, reject único, status/reason/reviewer correctos, delta secundario cero, cleanup y baseline PASS.

## STOP
Fixture ambiguo, request baseline, más de un child, asociación loan/return, delta inesperado, email/Server Action no controlable, cleanup no exacto o state corrupto.
