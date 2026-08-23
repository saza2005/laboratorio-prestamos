# Plan de validación del hardening

1. Crear una tercera migración local a partir del archivo `.sql.review`, después de aprobar su alcance.
2. Ejecutar `supabase db reset --local --no-seed`.
3. Verificar que las 24 funciones tengan `anon=false` cuando corresponda, especialmente las mutacionales.
4. Verificar `authenticated=true` para las RPC usadas por la aplicación.
5. Verificar `service_role=true` sin cambiar sus permisos.
6. Verificar RLS en 19 de 19 tablas.
7. Verificar las 45 policies.
8. Ejecutar lint local y confirmar que no aparezcan warnings nuevos.
9. Ejecutar `db diff --local --schema public` y revisar cualquier diferencia.
10. Ejecutar pruebas de lectura por roles en el entorno local.
11. Ejecutar `db push --dry-run` contra E2E.
12. Revisar el diff remoto de permisos.
13. Solicitar autorización separada antes de cualquier `db push` real.

Este plan no se ha ejecutado. No incluye pruebas anónimas mutacionales ni modificaciones remotas.
