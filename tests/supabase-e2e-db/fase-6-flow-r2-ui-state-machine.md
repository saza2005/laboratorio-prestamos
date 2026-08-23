# FLOW-R2 - UI state machine

## STATE-0
Ruta `/dashboard/solicitudes`, rol `admin`, tabla de solicitudes visible y filtro de estado/search disponible. No hay escritura remota.

## Transition 0 -> 1
Filtrar por el identificador descriptivo de la solicitud pending baseline y seleccionar la fila visible. Es una transición client-only; no Server Action, RPC ni escritura.

## STATE-1
El drawer de detalle muestra una solicitud pending y el panel de acciones contiene el formulario `Rechazar solicitud`.

## Transition 1 -> READY_TO_REJECT
Localizar `textarea[name="rejection_reason"]`, rellenar un motivo dummy y localizar el botón exacto `Rechazar`. La preparación es client-only; no confirma la acción.

## READY_TO_REJECT
El formulario tiene request_id oculto, motivo opcional disponible y botón submit visible/enabled. El click del botón queda fuera del helper READ_ONLY.

## Write boundary
Solo el submit del formulario de rechazo alcanza `rejectRequestWithState`, `reject_request_transaction` y la actualización de `requests`. No se ejecutó en 6.2B.
