# FASE 2 — Dry-run de la tercera migración

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
- Archivos SQL encontrados: 3, exactamente los autorizados
- Migraciones anteriores modificadas: no
- Tercera migración modificada: no durante esta tarea

## 3. Auditoría estática

- Funciones: 21
- REVOKE PUBLIC: 21
- REVOKE anon: 21
- GRANT: 0
- ALTER DEFAULT PRIVILEGES: 0
- Cambios de tablas: 0
- Cambios de policies: 0
- Cambios de RLS: 0
- Operaciones de datos: 0

## 4. Historial antes

- Versiones locales: 20260805220647, 20260805223410, 20260806001035
- Versiones remotas: 20260805220647, 20260805223410
- Migración pendiente: 20260806001035
- Versiones adicionales: ninguna

## 5. Dry-run

- Comando: npx supabase db push --dry-run
- Resultado: exitoso
- Migraciones propuestas: 20260806001035_harden_all_anon_function_execute.sql
- Cantidad: 1
- Archivos inesperados: ninguno
- Escrituras remotas: no
- Error: ninguno
- SQLSTATE: ninguno

## 6. SQL propuesto

- Funciones: 21
- Revocaciones PUBLIC: 21
- Revocaciones anon: 21
- authenticated afectado: no
- service_role afectado: no
- Default ACL afectado: no
- Tablas afectadas: no
- Policies afectadas: no
- Datos afectados: no
- Limitaciones de la salida CLI: el dry-run identifica el archivo y no imprime todo su SQL; el contenido fue validado estáticamente contra la migración local con el hash esperado

## 7. Historial después

- Versiones locales: 20260805220647, 20260805223410, 20260806001035
- Versiones remotas: 20260805220647, 20260805223410
- Diferencias antes/después: ninguna
- Historial modificado: no

## 8. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E modificado: no
- db push real: no
- db reset --linked: no
- migration repair: no
- RPC: ninguna
- Secretos: no mostrados
- Staging: no
- Commit: no

## 9. Conclusión

- Dry-run válido: sí
- Solo propone la tercera migración: sí
- Riesgos pendientes: el default ACL de plataforma permanece diferido y documentado; no forma parte de esta migración
- Lista para push real: sí
- Requiere autorización: sí, autorización explícita separada para el push real
- Siguiente paso: solicitar confirmación antes de ejecutar npx supabase db push
