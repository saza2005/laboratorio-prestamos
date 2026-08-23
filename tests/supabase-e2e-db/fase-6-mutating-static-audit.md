# FASE 6 — Auditoría estática MUTATING

## Entry points

Se encontraron 11 wrappers mutantes de UI y 11 RPC de negocio utilizadas por la aplicación: creación/cancelación de solicitud, aprobación, rechazo, entrega, préstamo directo, devolución parcial, devolución completa, creación de item, cambio de estado de unidad y mantenimiento.

## Roles y tablas

Teacher/student crean solicitudes. Admin/lab_staff deciden solicitudes, entregan, prestan, reciben devoluciones, gestionan inventario y registran mantenimiento. Las tablas afectadas, movimientos y efectos están en el CSV de entrypoints.

## Riesgos

R1/R2 son LOW; R3/R4/L2/RET1/RET2 son MEDIUM; L1/M1/I1 son HIGH. La clasificación considera número de tablas, stock, unidades tracked, movimientos y reversibilidad.

## Namespace y cleanup

La estrategia recomendada es entidades dedicadas por test con namespace `E2E_MUT_*`. El cleanup futuro será separado, allowlisted y consciente de FK/cascadas. No se implementó ni ejecutó cleanup en 6.1A.

## Service role

La mutación de negocio usa roles reales. La restauración exacta probablemente requerirá un script administrativo E2E separado, porque no existe un flujo de UI general para eliminar únicamente entidades de prueba. Esa necesidad queda pendiente de 6.1B y no se usó service role aquí.

## Primer flujo recomendado

FLOW-R1: crear una solicitud individual efímera. Toca solo `requests` y `request_items`, no inventory ni movimientos, y tiene rollback viable por ID exacto si permanece pendiente.

## Bloqueantes actuales

No hay bloqueante de código para la auditoría. Sí hay dos prerequisitos para ejecutar la primera mutación: harness de seed/cleanup allowlisted y autorización independiente de escritura/rollback. Por ello ningún test mutante queda autorizado por este documento.
