# FASE 6 - Hardening pre-submit FLOW-R1

## 1. Segundo fallo
La causa anterior fue el selector de comentarios. Se corrigio mediante un helper compartido. El ensayo completo posterior fallo antes de interactuar con el formulario: input[name="purpose"] no aparecio tras navegar.

## 2. Comentarios
El control real es textarea[name="comments"], con label visible Comentarios sin htmlFor. El binding confirmado es FormData.get('comments') -> p_comments -> requests.comments.

## 3. Auditoria completa
Se auditaron navigation, item, quantity, purpose, comments, fecha, validacion local y submit. La paridad estatica previa al submit es cero divergencias.

## 4. Helper compartido
Se creo prepareFlowR1RequestForm. Ambos tests lo reutilizan. El helper no hace submit, no modifica state y no llama APIs mutantes.

## 5. Paridad
La matriz registra el mismo camino pre-submit para ambos tests. La cobertura runtime no alcanzo ningun control porque la pagina no presento purpose.

## 6. Ensayo READ_ONLY
Se ejecuto una vez el test de ensayo completo. Resultado FAIL antes del primer control; submits=0 y writes=0.

## 7. Validacion del formulario
No aplicable en runtime: el formulario no estuvo disponible. El checkValidity esta implementado en el helper para el proximo ensayo.

## 8. Integridad
Clean-state, baseline y storageState postflight fueron PASS. No hubo RPC negocio, writes remotas ni cambios de baseline.

## 9. Deuda de accesibilidad
Se identifican labels sin htmlFor para purpose, comments, fecha y quantity. No se modifico produccion en esta fase.

## 10. Conclusion
FASE 6.1E no completada. El desacoplamiento de selectores fue eliminado estaticamente, pero falta resolver por que la ruta no renderiza el formulario en el ensayo READ_ONLY. No se ejecutara FLOW-R1 mutante ni un segundo ensayo en esta fase.
