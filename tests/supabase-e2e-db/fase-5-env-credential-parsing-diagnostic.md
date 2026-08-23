# FASE 5 — Diagnóstico de parsing de credenciales E2E

## 1. Comparación inicial

- Variables revisadas: 8 email/password.
- Variables sin comillas detectadas inicialmente: 8.
- Contraseñas con # fuera de comillas: 4.
- Diferencias raw/parsed iniciales: 4.
- Categoría inicial: inline_comment.
- RAW_AND_PARSED_MATCH inicial: FAIL.
- MANUAL_COPY_MISMATCH_CONFIRMED inicial: yes.

La diferencia afectaba a las cuatro contraseñas: Node interpretaba el texto posterior a # como comentario. No se muestran valores ni fragmentos.

## 2. Normalización

- .env.e2e normalizado: sí.
- Representación: comillas dobles JSON para los valores efectivos interpretados por Node.
- Escritura: atómica.
- Valores efectivos modificados: no.
- Variables no objetivo perdidas: no.
- Comparación efectiva antes/después: MATCH.
- RAW_AND_PARSED_MATCH posterior: PASS.
- Contraseñas con # fuera de comillas posterior: 0.
- Permisos: 600.
- Archivo ignorado por Git: sí.
- .env.app-e2e modificado: no.

## 3. Auth posterior

- Admin: PASS; logout PASS.
- Lab staff: PASS; logout PASS.
- Teacher: PASS; logout PASS.
- Student: PASS; logout PASS.
- Usuarios Auth modificados: no.
- Contraseñas restablecidas: no.
- Sesiones persistidas: no.
- Tokens mostrados: no.

## 4. Baseline

- Baseline posterior: PASS.
- Código: 0.
- Datos public modificados: no.
- RPC de negocio: 0.
- Escrituras remotas: 0.
- Staging: vacío.

## 5. Conclusión

- Causa de la discrepancia de copia manual: confirmada.
- Corrección aplicada: normalización segura de .env.e2e conservando los valores efectivos.
- Listo para repetir prueba manual admin: sí.
- Otras cuentas manuales: no probadas en esta tarea.
- Playwright/storageState: no ejecutados.
