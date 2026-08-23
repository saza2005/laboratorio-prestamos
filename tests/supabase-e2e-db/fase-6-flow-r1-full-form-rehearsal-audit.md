# FLOW-R1 - Full pre-submit rehearsal

## Form controls
El formulario real define purpose, comments, scheduled_return_date, un item bulk, quantity y submit. Los cuatro labels visibles relevantes no tienen htmlFor; la deuda de accesibilidad se mantiene documentada sin cambiar produccion.

## Binding
purpose llega por FormData.get('purpose') a p_purpose y requests.purpose. comments llega por FormData.get('comments') a p_comments y requests.comments. scheduled_return_date y request items siguen sus nombres reales.

## Selectors
Se corrigio comments a textarea[name="comments"]. El helper comun usa input[name="purpose"], textarea[name="comments"], input[name="scheduled_return_date"], el boton cuyo nombre contiene el codigo estable del item bulk, input[type="number"] despues de seleccionar un item y el boton submit con nombre exacto.

## Shared helper
Se creo tests/e2e/mutating/helpers/request-create-form.ts. Solo contiene interaccion Playwright pre-submit, valida valores, checkValidity y localiza submit. No hace click submit, no toca state y no consulta APIs administrativas.

## UI contract
request-create.ui-contract.spec.ts y request-create.spec.ts importan el mismo helper. La unica diferencia permitida queda despues de la preparacion: el contrato se detiene y el mutante envia y registra.

## Mutating test
El submit permanece fuera del helper y solo existe en request-create.spec.ts. No se ejecuto durante esta fase.

## Parity
La matriz de paridad fue creada. La divergencia estatica y runtime pre-submit es cero tras la revalidacion.

## Client validity
La UI alcanzo READY_TO_SUBMIT y form.checkValidity() fue verdadero.

## Submit isolation
El helper no hace submit; el contrato solo localiza el boton. No hubo click, Enter, form.submit, requestSubmit ni Server Action mutante.

## Execution
El contrato READ_ONLY fue ejecutado una vez en chromium-student y paso 1/1. Ejercito item, quantity, purpose, comments, fecha, validez local y localizacion del submit. Cobertura pre-submit: 100%.

## Remote effects
REMOTE_WRITES=0, BUSINESS_RPC=0 y MUTATING_RESIDUALS=0. Baseline, storageState y pre-state FLOW-R1 permanecieron PASS; hashes MATCH.

## Conclusion
La revalidacion confirma definitivamente el full pre-submit rehearsal READ_ONLY. FLOW-R1 queda listo para una autorizacion independiente de ejecucion MUTATING. Los intentos fallidos anteriores se conservan como historial.
