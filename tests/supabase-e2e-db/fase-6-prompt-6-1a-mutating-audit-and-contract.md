# FASE 6 — Auditoría y contrato MUTATING

## 1. Estado heredado

Baseline y storageState fueron verificados al inicio y no se ejecutaron mutaciones. El proyecto normal permaneció fuera del alcance.

## 2. Entry points de escritura

Se inventariaron 11 Server Actions/wrappers y 11 RPC de negocio utilizadas por UI. El detalle está en `fase-6-mutating-entrypoints.csv`.

## 3. Server Actions y RPC

La aplicación usa RPC transaccionales para solicitudes, decisiones, entrega, préstamos, devoluciones, mantenimiento e inventario. Se documentaron roles, `auth.uid()`, tablas, stock, unidades y movimientos sin invocar ninguna RPC.

## 4. Flujos funcionales

Se evaluaron 10 flujos: R1, R2, R3, R4, L1, L2, RET1, RET2, M1 e I1. Las rutas reales existen para estos puntos; sus acciones no se ejecutaron.

## 5. Riesgo

2 LOW, 5 MEDIUM y 3 HIGH. No se clasificó un flujo como BLOCKED por ausencia de UI; todos quedan no autorizados hasta 6.1B.

## 6. Estrategia de aislamiento

Se recomienda B: entidades dedicadas por escenario, complementadas por namespace. No se mutará directamente el baseline A/B/C/D.

## 7. Namespace

Se definieron prefijos `E2E_MUT_REQ_`, `E2E_MUT_LOAN_`, `E2E_MUT_RETURN_`, `E2E_MUT_MAINT_` y `E2E_MUT_ITEM_`.

## 8. State

Se diseñó `.e2e-state/mutating-tests.json` como futuro state de IDs, 600 e ignorado. No se creó ni contiene datos.

## 9. Cleanup

Se diseñó cleanup separado, allowlisted y limitado a IDs de FASE 6. No se usó DELETE global ni TRUNCATE. Las FK y cascadas fueron revisadas estáticamente.

## 10. Rollback

R1 tiene rollback viable por request ID mientras permanezca pendiente. Los flujos de inventario, préstamos y devoluciones requieren entidades dedicadas y restauración comprobada de stock/unidades/movimientos.

## 11. Guards

Se diseñaron guard de mutación y verificador clean-state de solo lectura, pendientes de implementación en 6.1B. El futuro guard exigirá Project Ref E2E, baseline, storageState, namespace y allowlist.

## 12. Primer flujo recomendado

FLOW-R1, solicitud individual efímera de un usuario ya validado. Es el menor delta y no toca inventario ni movimientos.

## 13. Roadmap

6.1B harness; 6.2 solicitudes; 6.3 préstamos/entrega; 6.4 devoluciones; 6.5 mantenimiento/inventario; 6.6 regresión y clean-state.

## 14. Seguridad

No se consultó el proyecto normal, no se usó service role, no se ejecutaron tests/RPC/escrituras y no se incluyeron secretos.

## 15. Integridad

Postflight requerido: baseline PASS, storageState PASS, writes durante 6.1A=0.

## 16. Conclusión

FASE 6.1A queda completada como auditoría y diseño. La siguiente etapa debe preparar el harness sin ejecutar aún un flujo mutante real.
