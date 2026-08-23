# FLOW-R1 - Crear solicitud individual efimera

## Rol
student es el actor recomendado y ya tiene storageState validado. teacher tambien cumple el permiso, pero no se usa en la primera ejecucion.

## Ruta y UI
Ruta /solicitudes/nueva. El trigger es el formulario con campos purpose, comments, scheduled_return_date, seleccion de un item disponible y boton exacto Enviar solicitud.

## Pre-state
Baseline PASS, storageState PASS, state MUTATING vacio, sin namespace E2E_MUT_REQ_.

## Datos de entrada
Proposito fijo E2E_MUT_REQ_R1_SCENARIO; comentario descriptivo; un item bulk activo con stock disponible; cantidad 1; fecha opcional valida si la UI la requiere.

## Server Action y RPC
createRequestWithState llama persistRequest, que llama create_request_transaction. El RPC valida auth.uid() y role teacher/student.

## Delta esperado
requests +1 y request_items +1 para una sola seleccion. Sin cambios en items, item_units, loans, returns, maintenance_records o inventory_movements.

## Tablas permitidas
requests, request_items.

## Tablas prohibidas
Todas las demas tablas de negocio, Auth, profiles y staging.

## Correlation marker
El campo persistido utilizado es requests.purpose, que forma parte del create request real y no altera inventario ni el ciclo de aprobacion. Cada ejecucion prepara antes del navegador un marcador unico con el prefijo E2E_MUT_REQ_R1_. El marcador se incluye en purpose y se guarda atomicamente en el state local antes del submit.

## Captura de ID
La captura primaria aplica el filtro exacto por el marcador, abre la unica solicitud resultante y lee el request_id oculto de la vista de detalle. El ID se registra inmediatamente, antes de aserciones posteriores.

## Recovery ID capture
Si la captura primaria no registra el ID, un resolver de solo lectura consulta exclusivamente el proyecto E2E por purpose exacto, valida owner/rol y estado pending, y acepta solo una coincidencia. Cero coincidencias significa que no se detecto escritura; mas de una coincidencia bloquea la recuperacion.

## Untracked write prevention
La cadena durable es: marcador generado localmente, state pre-write persistido, marcador enviado en la misma solicitud y recuperacion exacta disponible. Por ello la ventana de escritura confirmada sin identificador recuperable es cero.

## Ambiguous recovery STOP
Nunca se selecciona la ultima solicitud, un timestamp, el primer resultado ni una coincidencia arbitraria. Una recuperacion ambigua detiene el flujo y conserva el state para diagnostico.

## State
El ID se registra atomicamente antes de cualquier asercion posterior. Si el registro falla, el flujo queda bloqueado para cleanup/recovery.

## Rollback
Solo si la request sigue pendiente, no tiene loan/return y sus hijos pertenecen al request registrado. La ejecucion real se hara con cleanup administrativo separado y autorizacion especifica.

## Failure recovery
Antes de ID: baseline/pre-state; despues de ID: marcar cleanup_required y no ejecutar otro flujo; cleanup fallido bloquea fase posterior.

## Artifacts
Video, trace y screenshot apagados inicialmente. Cualquier diagnostico posterior sera sanitizado.

## PASS
UI confirma creacion y estado pendiente; delta exacto; ID registrado; cleanup posterior y baseline PASS.

## STOP
ID ambiguo, estado no pendiente, referencia a prestamo, delta inesperado, cualquier escritura fuera de allowlist o state local corrupto.

## UI contract
- Apertura: /solicitudes/nueva.
- Item: boton accesible cuyo nombre contiene el codigo estable E2E_ITEM_BULK.
- Quantity: input type=number de la unica fila seleccionada.
- Purpose: input[name="purpose"].
- Comments: textarea[name="comments"].
- Fecha: input[name="scheduled_return_date"].
- Submit: boton con nombre exacto Enviar solicitud.

El test de contrato UI READ_ONLY debe pasar antes de cualquier futura generacion de correlation marker o submit MUTATING.

## Pre-submit shared path
La preparacion comun esta en tests/e2e/mutating/helpers/request-create-form.ts y es usada por el contrato READ_ONLY y FLOW-R1.

## Comments control
El control real es textarea[name="comments"]. Su valor se mapea a FormData.get('comments'), p_comments y requests.comments.

## Selector parity
La ruta pre-submit compartida tiene divergencia estatica cero. La auditoria runtime queda bloqueada hasta resolver la ausencia del formulario durante el ensayo.

## Full form rehearsal
Requisito previo satisfecho: FLOW_R1_FULL_PRE_SUBMIT_REHEARSAL: PASS. El ensayo READ_ONLY completo fue ejecutado una vez, alcanzo READY_TO_SUBMIT, valido el formulario localmente y no hizo submit.

La cobertura pre-submit confirmada es 100% y todos los controles usados por FLOW-R1 son ejercitados por el contrato READ_ONLY antes de autorizar una futura mutacion.
