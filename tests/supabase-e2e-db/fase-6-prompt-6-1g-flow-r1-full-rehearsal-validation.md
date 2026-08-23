# FASE 6 - Validacion full rehearsal FLOW-R1

## 1. Estado heredado
FASE 6.1F dejo confirmada la maquina de estados UI y el helper compartido. No se autorizo ninguna mutacion en esta fase.

## 2. Helper compartido
`prepareFlowR1RequestForm` fue utilizado por el test mutante y el contrato READ_ONLY. La divergencia pre-submit fue 0 y el submit permanecio fuera del helper.

## 3. Preflight
Baseline, storageState, clean-state y guard MUTATING pasaron. `UNTRACKED_WRITE_WINDOW=0`.

## 4. Auditoria READ_ONLY
El contrato no contiene submit, Enter, `requestSubmit`, `form.submit`, Server Action mutante, RPC de negocio ni write administrativo. Usa datos dummy solo en el navegador.

## 5. Ejecucion
El listado selecciono exactamente 1 test en `chromium-student`, sin dependencias Auth. La ejecucion autorizada paso 1/1 en el path esperado `/solicitudes/nueva`.

## 6. Cobertura pre-submit
Se ejercitaron item, quantity, purpose, comments, fecha, validez del formulario y localizacion del submit. Cobertura: 100%. El submit no fue pulsado.

## 7. Validacion del formulario
La UI alcanzo READY_TO_SUBMIT y `form.checkValidity()` fue verdadero. No se uso espera ciega.

## 8. Integridad remota
Writes remotas: 0. RPC de negocio: 0. Clean-state posterior PASS, residuals MUTATING 0 y baseline posterior PASS.

## 9. State y storageState
El state MUTATING quedo CLEAN/IDLE, sin IDs ni cleanup pendiente. StorageState PASS con los cuatro hashes conservados.

## 10. Artifacts
No se generaron artifacts sensibles nuevos. Los screenshots históricos de intentos fallidos no se mezclan con esta ejecución.

## 11. Conclusión
FASE 6.1G queda completada. El full rehearsal está validado definitivamente y FLOW-R1 queda listo para una nueva autorización explícita de FASE 6.2A. Esta fase no ejecutó FLOW-R1 MUTATING.

Nota operativa: el puerto 3000 quedó libre y no quedaron procesos Chromium. Se observó un `next-server` root preexistente que no escucha en 3000 y no pudo ser detenido por permisos; no pertenece al cierre E2E.
