# FASE 6 — Reconciliación runtime-handshake FLOW-R2

## 1. Estado heredado
El intento BF-R alcanzó ACTION_ARMED, pero el parent rechazó ese estado. El fixture fue limpiado y el entorno quedó baseline, storageState y clean-state PASS.

## 2. Auditoría de estados
La allowlist original contenía estados de smoke y parte del protocolo real, pero omitía ACTION_ARMED y ACTION_GO. ACTION_DONE sí estaba definido; ACTION_RUNNING estaba definido pero no se usa en el flujo real.

## 3. Root cause
Clasificación E: combinación de omisión al extender el protocolo real y listas/contratos no reconciliados entre parent, browser y utility. Las pruebas anteriores no ejercitaban el tramo ACTION_ARMED -> ACTION_GO -> ACTION_DONE.

## 4. Definición canónica
RUNTIME_HANDSHAKE_STATES y RUNTIME_HANDSHAKE_TRANSITIONS son ahora la única definición de estados y transiciones. Se agregaron ACTION_ARMED y ACTION_GO porque son estados reales utilizados; no se acepta cualquier string.

## 5. Validación ACTION_ARMED
La utility valida run identity, schema y transición. El browser también valida la señal anterior y la nueva antes de escribirla. Duplicados, stale runs, unknown states y transiciones prematuras son rechazados.

## 6. ACTION_DONE y terminación
ACTION_DONE está soportado desde ACTION_GO/ACTION_RUNNING y conduce a CANCEL; CANCEL y ABORT conducen a CLEAN. ACTION_RUNNING está definido, pero no se publica en esta implementación.

## 7. Tests locales
Node checks, TypeScript y ESLint PASS. Las pruebas locales validan roundtrip real, rutas de fallo, estados desconocidos, stale identity, duplicados y saltos inválidos. No se inició browser.

## 8. Validaciones READ_ONLY
Orchestrator dry-run: 1 browser test, FLOW-R2, auth dependencies 0, second browser launches 0. Seed y cleanup dry-run tienen writes/targets 0; R2 pre y R1 regression PASS.

## 9. Integridad
Remote writes=0, business RPC=0, state CLEAN, residual MUTATING=0. No se modificaron negocio, Supabase, storageState, dependencias ni sandbox.

## 10. Conclusión
El contrato ACTION_ARMED parent/child y el siguiente estado ACTION_DONE quedaron reconciliados y probados localmente. La siguiente ejecución real requiere una autorización nueva; esta fase no la ejecuta.
