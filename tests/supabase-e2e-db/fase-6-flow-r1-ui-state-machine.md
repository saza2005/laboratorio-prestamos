# FLOW-R1 - UI state machine

## STATE-0
Ruta final /solicitudes/nueva. Item bulk, purpose, comments, fecha y boton submit estan presentes. Quantity no existe porque no hay fila seleccionada. La captura runtime mostro loading=false.

## Transition 0 -> 1
Accion: click en el boton cuyo nombre contiene el codigo estable del item bulk. Es una transicion client-only de React. No hay lectura remota ni escritura remota.

## STATE-1
El item deja de estar en la lista disponible y aparece una fila seleccionada. Quantity aparece con valor inicial 1. Purpose, comments, fecha y submit continuan presentes.

## Transition 1 -> READY_TO_SUBMIT
Acciones: rellenar quantity, purpose, comments y fecha con valores validos de browser. Son cambios client-side del formulario. No se dispara submit ni Server Action.

## READY_TO_SUBMIT
La ruta sigue siendo /solicitudes/nueva. Todos los controles estan presentes, el boton submit esta habilitado y form.checkValidity() devuelve true. El submit es una accion posterior y separada.

## Campos
- ITEM_APPEARS_AT_STATE: STATE-0.
- QUANTITY_APPEARS_AT_STATE: STATE-1.
- PURPOSE_APPEARS_AT_STATE: STATE-0.
- COMMENTS_APPEARS_AT_STATE: STATE-0.
- DATE_APPEARS_AT_STATE: STATE-0.
- SUBMIT_APPEARS_AT_STATE: STATE-0.

## Root cause
La UI no exige que purpose o comments aparezcan despues del item. El orden observado es compatible con el helper corregido. La ausencia anterior fue transitoria; con la evidencia disponible se clasifica como E, loading/render readiness, no como una condicion de render permanente. No se uso waitForTimeout.

## Runtime
STATE_0 y STATE_1 coincidieron con el render estatico. READY_TO_SUBMIT alcanzo validez HTML local. No hubo submit ni escritura.
