# FLOW-R1 - UI state machine audit

## Static render conditions
NuevaSolicitudPage obtiene items y renderiza RequestForm. RequestForm renderiza purpose, comments, fecha y submit desde el primer render. La fila de quantity solo aparece cuando rows contiene un item.

## Runtime state 0
El test registro pathname /solicitudes/nueva, item=true, quantity=false, purpose=true, comments=true, date=true y submit=true.

## Transitions
La transicion inicial es seleccionar el boton del item bulk. Es client-only y no tiene escritura. Despues aparece quantity con valor 1.

## Runtime states
En STATE-1 item=false, quantity=true y los campos restantes siguen presentes. Al completar valores dummy se alcanzo READY_TO_SUBMIT con form_valid=true.

## Field appearance
Item y campos de formulario aparecen en STATE-0. Quantity aparece en STATE-1. Submit aparece en STATE-0 y permanece habilitado cuando hay item.

## Helper previous order
El helper anterior rellenaba purpose/comments/fecha antes del item. Ese orden era compatible con el render real, pero se reordeno para seguir el flujo observado: item, quantity, campos.

## Correct order
navigate -> select item -> quantity -> purpose -> comments -> date -> local validity -> locate submit. No submit.

## Root cause
La causa operacional mas probable de las ausencias anteriores fue E, loading/render readiness transitoria. El diagnostico actual no reproduce la ausencia y confirma la ruta correcta.

## Helper correction
El helper fue reordenado sin waits ciegos. Ambos tests siguen usando el mismo helper y submit permanece fuera.

## Write reachability
El diagnostico no contiene submit, Enter, form.submit, requestSubmit, Server Action ni RPC negocio. Remote writes=0.

## Conclusion
La maquina de estados estatica y runtime coincide. Queda pendiente una fase posterior para repetir el full rehearsal con el helper corregido.
