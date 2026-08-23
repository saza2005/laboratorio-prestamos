# FASE 6 - Diagnóstico state machine FLOW-R1

## 1. Fallo heredado
Los dos intentos previos fallaron antes del submit por selectores de labels no asociados. El full rehearsal de 6.1E tampoco pudo observar el formulario en runtime.

## 2. Renderizado estático
La pagina /solicitudes/nueva renderiza RequestForm. Purpose, comments, fecha y submit se renderizan inicialmente; quantity depende de rows con un item.

## 3. Helper anterior
El helper rellenaba campos antes de seleccionar el item. El orden no era la causa estructural porque esos campos existen en STATE-0. Se reordeno para seguir la transicion observable item -> quantity -> campos.

## 4. Diagnóstico runtime
El test state-machine fue ejecutado una sola vez y paso. STATE_0 tuvo pathname correcto y todos los controles excepto quantity. Tras seleccionar item aparecio quantity. Los valores dummy se establecieron sin submit.

## 5. Máquina de estados
Se observaron STATE-0, STATE-1 y READY_TO_SUBMIT. form.checkValidity() fue true. No se uso correlation marker real.

## 6. Causa raíz
La evidencia actual apunta a E, loading/render readiness transitoria, para la ausencia anterior. No se reprodujo una restriccion de rol ni un redirect.

## 7. Helper corregido
El helper compartido fue reordenado a navigation, item, quantity, purpose, comments, date, validity y submit locate. No contiene waits ciegos ni submit.

## 8. Integridad
Clean-state, baseline y storageState fueron PASS antes y despues. Remote writes=0, RPC negocio=0 y state CLEAN.

## 9. Seguridad
Solo se ejecuto el diagnostico READ_ONLY autorizado. No hubo submit, login nuevo, logout, cleanup real ni mutacion.

## 10. Conclusion
FASE 6.1F completada. La maquina de estados UI esta reconstruida y coincide entre codigo y runtime. El full rehearsal corregido requiere una autorizacion posterior independiente.
