# FASE 6 - Hardening de tracking FLOW-R1

## 1. Bloqueos originales
La ejecucion de FASE 6.2A se detuvo antes del preflight funcional. Faltaba la confirmacion local requerida por el harness y la captura primaria del request_id ocurria demasiado tarde. No hubo login nuevo, Playwright funcional, RPC ni escritura remota.

## 2. Confirmacion MUTATING
Se identifico el contrato de confirmacion exigido por guard, runner y cleanup. La confirmacion se configuro solo en .env.e2e, sin mostrar su valor, y el archivo conserva permisos restrictivos e ignorancia de Git.

## 3. Campo de correlacion
La auditoria de la UI, Server Action, RPC y esquema confirmo que requests.purpose es un campo real persistido por create_request_transaction. Es semantico para el proposito de la solicitud, cabe el marcador E2E y no modifica inventario ni cambia la logica de aprobacion.

## 4. Correlation marker
Cada ejecucion futura genera antes del navegador un marcador unico con prefijo E2E_MUT_REQ_R1_. Se persiste atomicamente en el state local antes del submit y se envia en purpose. No se usa el timestamp ni una coincidencia de "ultima solicitud".

## 5. State pre-write
El state admite una fase previa con FLOW-R1 activo, correlation_marker, actor, item, cantidad, request_id null, remote_write_confirmed false y cleanup_required false. El state queda durable antes del navegador. Los tests locales con datos dummy validaron esquema, namespace y rechazos de estados invalidos.

## 6. Primary ID capture
La captura primaria filtra la lista por el marcador exacto, abre la unica coincidencia y lee el request_id oculto de la vista de detalle. El ID se registra atomicamente antes de aserciones UI posteriores.

## 7. Recovery capture
Se creo un resolver de solo lectura para consultar exclusivamente el proyecto E2E por purpose exacto, owner/rol esperado y estado pending. Cero coincidencias se clasifica como no-write detectada; una coincidencia registra el ID exacto; mas de una coincidencia bloquea. No hay recuperacion arbitraria.

## 8. Cleanup
El cleanup sigue separado del navegador y requiere IDs exactos registrados. No permite borrar directamente por marcador, prefijo, patron amplio o IDs recibidos por CLI. En esta fase solo se ejecuto dry-run con state limpio y cero targets.

## 9. Failure recovery
Antes de escribir, el marker y metadata minima estan fuera del browser. Si la captura primaria falla, el resolver puede recuperar de forma exacta. Si la recuperacion es ambigua, se detiene y se conserva el state. Un cleanup fallido no se oculta ni permite iniciar otro flujo.

## 10. Guard
El guard valida confirmacion, baseline, storageState, entorno E2E, state limpio, namespace, recovery disponible y ventana de tracking cero. Resultado de validacion: PASS. No se ejecutaron writes.

## 11. Auditorias
La auditoria anti-destructiva encontro solo operaciones de cleanup futuras ligadas a IDs exactos y allowlist FLOW-R1. No hay TRUNCATE, delete global, delete por prefijo, IDs arbitrarios ni seleccion por ultima solicitud. La auditoria de recovery tambien fue PASS.

## 12. Integridad
Baseline, storageState y clean-state fueron PASS antes y despues. Los cuatro storageState conservaron sus hashes. El state MUTATING quedo CLEAN, sin IDs remotos ni cleanup pendiente. Remote writes y RPC de negocio fueron cero.

## 13. Conclusion
FASE 6.1C queda completada. FLOW-R1 tiene tracking pre-write durable, captura primaria y recuperacion exacta. Queda listo para una autorizacion independiente de FASE 6.2A, que no se ejecuta en esta fase.
