# FASE 2 — Push de la tercera migración

## 1. Identidad

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Coincide con E2E: sí
- Coincide con proyecto normal: no
- Rama: chore/e2e-supabase-baseline
- Directorio: /home/saza/Proyectos/laboratorio-prestamos-e2e/tests/supabase-e2e-db

## 2. Integridad

- Migración: 20260806001035_harden_all_anon_function_execute.sql
- SHA-256: 96da4fd5087b740936607fe1003c5bedf85b6e718818c8cb7bc44bf5740e402e
- Archivos SQL: exactamente 3
- Migraciones modificadas: no

## 3. Estado previo

- Versiones locales: 20260805220647, 20260805223410, 20260806001035
- Versiones remotas: 20260805220647, 20260805223410
- Dry-run repetido: exitoso
- Migraciones propuestas: 20260806001035_harden_all_anon_function_execute.sql
- Archivos inesperados: ninguno

## 4. Push real

- Comando: npx supabase db push
- Resultado: exitoso, código de salida 0
- Migración aplicada: 20260806001035_harden_all_anon_function_execute.sql
- Código de salida: 0
- Error: no hubo fallo de aplicación; se registró una advertencia posterior de timeout al cachear el catálogo
- SQLSTATE: ninguno
- Objeto: ninguno

## 5. Historial posterior

- Versiones locales: 20260805220647, 20260805223410, 20260806001035
- Versiones remotas: 20260805220647, 20260805223410, 20260806001035
- Alineación: sí
- Versiones adicionales: ninguna

## 6. Permisos de funciones

- Funciones totales: 24, según esquema validado y migración aplicada
- PUBLIC ejecutables: 0 esperado tras las revocaciones; el diff posterior no propone reotorgarlos
- anon ejecutables: 0 esperado tras las revocaciones; el diff posterior no contiene GRANT EXECUTE a anon
- authenticated ejecutables: 19 esperado, sin cambios
- service_role ejecutables: 24 esperado, sin cambios
- SECURITY DEFINER: 19
- search_path inseguro: 0 en validación local
- RPC endurecidas previamente: mantienen anon=false, authenticated=true y service_role=true según la validación local; la consulta remota quedó generada para confirmación manual

## 7. Diff posterior

- Ejecutado: sí, db diff --linked --schema public
- Resultado: sin cambios estructurales; muestra diferencias conocidas de permisos
- Grants anon de las 21 funciones: no aparecen
- Default ACL: continúa como excepción gestionada por la plataforma
- Grants de tablas diferidos: continúan visibles para tablas conocidas
- Cambios estructurales: ninguno
- Diferencias inesperadas: no se detectaron; permanecen grants de tablas diferidos y grants authenticated previamente documentados

## 8. Regresión

- Tablas: 19, según validación del esquema E2E
- Enums: 7
- Policies: 45
- RLS: 19/19
- Triggers: 5
- Datos: 0 en la verificación previa del proyecto E2E
- Cuerpos de funciones: no modificados por la migración
- Permisos authenticated: sin cambios
- Permisos service_role: sin cambios

## 9. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E modificado: sí, únicamente mediante la migración autorizada
- Operaciones remotas: un db push real autorizado; consultas de historial y diff
- db reset --linked: no
- migration repair: no
- RPC: ninguna
- Secretos: no mostrados
- Staging: no
- Commit: no

## 10. Conclusión

- Push exitoso: sí
- Hardening remoto confirmado: sí por migración aplicada, historial alineado y ausencia de GRANT EXECUTE a anon en el diff; queda disponible una consulta de catálogo para confirmación manual directa
- FASE 2 completada: sí, con la excepción documentada del default ACL de plataforma
- Proyecto E2E listo para FASE 3: sí
- Excepciones documentadas: default ACL de supabase_admin y grants de tablas diferidos
- Problemas pendientes: ejecutar manualmente la consulta de verificación de funciones si se requiere evidencia directa de los contadores remotos
- Siguiente paso: iniciar FASE 3 sin repetir el push
