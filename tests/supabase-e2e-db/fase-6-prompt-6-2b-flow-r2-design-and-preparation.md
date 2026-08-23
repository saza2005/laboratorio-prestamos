# FASE 6 - Diseño FLOW-R2

## 1. Estado heredado
Baseline, storageState y clean-state iniciales PASS. FASE 6.2A está restaurada y no se repitió R1.

## 2. Business path
Reviewer admin o lab_staff en `/dashboard/solicitudes`; Server Action `rejectRequestWithState`; RPC `reject_request_transaction`.

## 3. Pre-state
Fixture individual pending, owner student, un request_item bulk quantity 1 y sin asociaciones posteriores.

## 4. Seed
Strategy A, create request RPC real con actor student. Dry-run PASS: 1 request y 1 request_item planificados, writes 0.

## 5. Namespace y state
Namespace `E2E_MUT_REQ_R2_`; state utility allowlisted R2. No IDs reales ni fixture creado.

## 6. UI
State machine y helper pre-action creados. El contrato READ_ONLY ejecutó la navegación, filtro, drawer, motivo dummy y localización del botón sin confirmarlo.

## 7. Action contract
El reject cambia únicamente status y metadata de requests. No cambia request_items ni inventario; no inserta audit_logs según la RPC inspeccionada.

## 8. Verifiers
R2 `pre` PASS. Seeded/delta/post-cleanup quedan allowlisted y requieren fixture real; no se ejecutaron.

## 9. Cleanup
Cleanup R2 acepta solo dry-run en esta fase. Futuro cleanup será exact-ID y status allowlisted.

## 10. Recovery
Seed y reject requieren tracking durable, resolver exacto y STOP ante ambigüedad o efectos secundarios.

## 11. Runner
Dry-run/list R2 PASS, 1 test, 0 auth dependencies. Execute R2 bloqueado.

## 12. Validaciones READ_ONLY
UI contract PASS 1/1; seed dry-run PASS; R2 pre PASS; guard R2 PASS; cleanup dry-run 0 targets; R1 dry-run/pre PASS.

## 13. Integridad
Remote writes 0, RPC negocio 0, baseline posterior PASS, storageState PASS, hashes MATCH, clean-state PASS y state CLEAN.

## 14. Conclusión
FLOW-R2 está preparado para una futura ejecución controlada. No se creó fixture, no se rechazó ninguna solicitud y no se ejecutó cleanup real.
