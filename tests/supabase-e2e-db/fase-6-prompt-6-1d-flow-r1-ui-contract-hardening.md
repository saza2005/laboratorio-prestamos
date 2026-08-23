# FASE 6 - Hardening UI FLOW-R1

## 1. Fallo original
La ejecucion unica anterior fallo antes del submit porque getByLabel('Propósito') no encontro el input. El label visible no tenia htmlFor asociado.

## 2. Formulario real
El formulario individual esta en /solicitudes/nueva. El control real es input[name="purpose"]. Los controles de comments y fecha tambien usan atributos name estables. La cantidad aparece tras seleccionar un item.

## 3. Binding purpose
La cadena verificada es input[name="purpose"] -> FormData.get('purpose') -> p_purpose -> create_request_transaction -> requests.purpose. El correlation marker seguira usando este camino.

## 4. Selectores
El selector purpose se corrigio a locator('input[name="purpose"]'). El selector del item se endurecio al boton cuyo nombre contiene el codigo estable del item bulk. El submit conserva getByRole con nombre exacto.

## 5. Test de contrato READ_ONLY
Se creo tests/e2e/mutating/request-create.ui-contract.spec.ts. No tiene submit, no llama Server Actions mutantes y solo selecciona un item para hacer visible el control de cantidad.

## 6. Ejecucion READ_ONLY
El listado selecciono exactamente un test, proyecto chromium-student, sin auth dependencies. La ejecucion fue PASS 1/1. No se ejecuto request-create.spec.ts mutante.

## 7. Correlation tracking
El test mutante conserva el marker pre-write y ahora lo introduce mediante input[name="purpose"]. El runner MUTATING solo fue usado en dry-run.

## 8. Integridad
Baseline, storageState y clean-state fueron PASS antes y despues. Remote writes=0, RPC negocio=0, submits=0 y residual MUTATING=0.

## 9. Artifacts
No se generaron artifacts sensibles nuevos en esta fase. Se mantiene un screenshot historico del fallo 6.2A sin publicar.

## 10. Conclusion
FASE 6.1D queda completada. FLOW-R1 esta listo para una nueva autorizacion independiente de FASE 6.2A, sin ejecutar esa fase aqui.
