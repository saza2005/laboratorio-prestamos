# FASE 3 — Dry-run de la cuarta migración

## 1. Identidad

- Proyecto: Supabase E2E
- Project Ref parcialmente oculto: rwni********wwim
- Coincide con E2E: sí
- Coincide con proyecto normal: no
- Rama: chore/e2e-supabase-baseline
- Directorio: tests/supabase-e2e-db

## 2. Integridad

- Migración: 20260806154909_revoke_authenticated_legacy_rpcs.sql
- SHA-256: 1286760da7ba8a7f35f50c3d111876f6de86df74f8c7c4f1c77967adfc8d4ba3
- Archivos SQL encontrados: 4
- Migraciones anteriores modificadas: no
- Cuarta migración modificada: no

## 3. Auditoría estática

- Funciones: 5
- REVOKE authenticated: 5
- REVOKE PUBLIC: 0
- REVOKE anon: 0
- REVOKE service_role: 0
- GRANT: 0
- ALTER DEFAULT PRIVILEGES: 0
- Cambios de tablas: 0
- Cambios de policies: 0
- Cambios de RLS: 0
- Operaciones de datos: 0

## 4. Historial antes

- Versiones locales: 20260805220647, 20260805223410, 20260806001035, 20260806154909
- Versiones remotas: 20260805220647, 20260805223410, 20260806001035
- Migración pendiente: 20260806154909
- Versiones adicionales: ninguna

## 5. Dry-run

- Comando: npx supabase db push --dry-run
- Resultado: exitoso; código 0
- Migraciones propuestas: 20260806154909_revoke_authenticated_legacy_rpcs.sql
- Cantidad: 1
- Archivos inesperados: ninguno
- Escrituras remotas: no
- Error: ninguno
- SQLSTATE: ninguno

## 6. SQL propuesto

- Funciones: las cinco firmas aprobadas
- Revocaciones authenticated: 5
- PUBLIC afectado: no
- anon afectado: no
- service_role afectado: no
- Tablas afectadas: no
- Policies afectadas: no
- RLS afectado: no
- Datos afectados: no
- Limitaciones de la salida CLI: el dry-run identifica el único archivo pendiente, pero no imprime cada sentencia SQL; el contenido se verificó mediante hash y auditoría estática local.

## 7. Historial después

- Versiones locales: 20260805220647, 20260805223410, 20260806001035, 20260806154909
- Versiones remotas: 20260805220647, 20260805223410, 20260806001035
- Diferencias antes/después: ninguna
- Historial modificado: no

## 8. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E modificado: no
- db push real: no
- db reset --linked: no
- migration repair: no
- RPC: no ejecutadas
- Secretos: no mostrados
- Staging: no
- Commit: no

## 9. Conclusión

- Dry-run válido: sí
- Solo propone la cuarta migración: sí
- Riesgos pendientes: confirmar el estado remoto después del push y verificar ACL mediante consulta de solo lectura.
- Lista para push real: sí, sujeto a autorización separada.
- Requiere autorización: sí
- Siguiente paso: solicitar autorización explícita para el push real; no ejecutarlo todavía.
