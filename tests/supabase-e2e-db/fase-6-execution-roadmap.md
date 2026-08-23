# FASE 6 — Roadmap de ejecución

## 6.1A — Auditoría y contrato
Objetivo: inventariar entrypoints, riesgos, FK, namespace y rollback. Escrituras: 0. Postflight: baseline y storageState PASS.

## 6.1B — Harness de escenarios
Objetivo: implementar guards de mutación, state file, seed limitado y cleanup allowlisted en modo revisable. Escrituras: solo si existe autorización posterior. Rollback: ninguno global. Riesgo: MEDIUM.

## 6.2A — Solicitud individual
Objetivo: ejecutar FLOW-R1 con entidad dedicada. Delta: request y request_item. Rollback: eliminar la solicitud exacta tras comprobar que no avanzó de estado. Riesgo: LOW.

## 6.2B — Ciclo de solicitudes
Objetivo: R2, R3 y R4 en escenarios separados. Delta: estados de solicitud y tablas de grupo. Rollback: request/group IDs exactos. Riesgo: LOW/MEDIUM.

## 6.3 — Préstamos y entrega
Objetivo: L1 y L2 con inventario dedicado. Delta: loans, items/units, movimientos y posiblemente request. Rollback: devolver/cancelar por contrato y cleanup de IDs. Riesgo: MEDIUM/HIGH.

## 6.4 — Devoluciones
Objetivo: RET1 y RET2 con préstamos dedicados. Delta: returns, loan_items, loans, stock, units y movements. Rollback: cleanup controlado y comprobación de stock. Riesgo: MEDIUM/HIGH.

## 6.5 — Mantenimiento e inventario
Objetivo: M1 e I1 con equipo/unidad dedicada. Delta: maintenance, items, units y movements. Rollback: retirar únicamente entidades dedicadas. Riesgo: HIGH.

## 6.6 — Regresión y clean-state final
Objetivo: verificar ausencia de namespace MUTATING, baseline exacto, storageState, Git y artifacts. Escrituras: 0. Riesgo: LOW, pero bloqueante si queda residual.

Cada subfase requiere baseline/storageState preflight, un solo escenario por bloque, verificación de delta y cleanup antes de continuar.
