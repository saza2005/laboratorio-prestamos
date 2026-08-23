# FASE 6 — Matriz de riesgo MUTATING

| Flujo | Riesgo | Escrituras principales | Reversibilidad | Decisión |
|---|---|---|---|---|
| FLOW-R1 | LOW_MUTATION | requests, request_items | Alta con request dedicada | Primer flujo recomendado |
| FLOW-R2 | LOW_MUTATION | requests, request_items | Alta con request dedicada | Después de R1 |
| FLOW-R3 | MEDIUM_MUTATION | requests, request_items | Alta, pero requiere request pendiente dedicada | No primero |
| FLOW-R4 | MEDIUM_MUTATION | request y tablas de grupo | Alta si no se entrega | Bloque de solicitudes grupales |
| FLOW-L1 | HIGH_MUTATION | loans, items, units, movements y request | Condicional | Requiere harness de inventario |
| FLOW-L2 | MEDIUM_MUTATION | loans, loan_items, items, units, movements | Condicional | Requiere inventario dedicado |
| FLOW-RET1 | MEDIUM_MUTATION | returns, loan_items, loans, inventory | Condicional | Requiere préstamo dedicado |
| FLOW-RET2 | MEDIUM_MUTATION | returns, loan_items, loans, inventory | Condicional | Requiere préstamo dedicado |
| FLOW-M1 | HIGH_MUTATION | maintenance, units, items, movements | Condicional | Requiere unidad dedicada |
| FLOW-I1 | HIGH_MUTATION | items, units y movimientos | Condicional | No usar baseline |

Conteo: 2 LOW, 5 MEDIUM, 3 HIGH, 0 BLOCKED por ausencia de UI. La ejecución de todos queda bloqueada hasta disponer de seed, cleanup y autorización específica.

## Estrategias

- A, mutar baseline y restaurar: descartada. Aumenta el riesgo de perder evidencia y de restaurar cantidades equivocadas.
- B, entidades dedicadas por test: recomendada. Cada escenario recibe IDs propios y un marcador E2E_MUT_*; el cleanup opera únicamente sobre esa allowlist.
- C, dataset adicional: útil como complemento organizativo, pero no elimina por sí sola el problema de cleanup y FK.
- D, reset remoto: descartada. Es global, destructiva y no compatible con el aislamiento requerido.

La recomendación operativa es B con namespace explícito, sin tocar A/B/C/D.

## Dependencias de rollback

Las migraciones muestran cascadas para hijos de requests, returns y loans, pero también RESTRICT desde request_items/loan_items hacia items. Por eso no se autoriza un borrado genérico: primero se deben registrar IDs exactos, verificar referencias y aplicar una allowlist en orden inverso a las FK. Las unidades y movimientos asociados a items dedicados requieren además validar stock y disponibilidad antes de eliminar.

## Primer flujo

FLOW-R1 es el menor riesgo: un estudiante o docente autenticado crea una solicitud individual dedicada; modifica requests y request_items, no inventory ni inventory_movements, y puede identificarse por su propósito/comentario E2E_MUT_REQ_<scenario>. Su rollback será viable mediante el ID exacto de la solicitud, después de verificar que no fue aprobada, entregada ni enlazada a un préstamo.
