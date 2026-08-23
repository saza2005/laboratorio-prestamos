# Auditoría de permisos del proyecto E2E

1. Abre únicamente el proyecto Supabase E2E confirmado. No abras el proyecto normal.
2. En el SQL Editor ejecuta por separado estos cuatro archivos, sin modificarlos:
   - `fase-2-e2e-audit-function-grants.sql`
   - `fase-2-e2e-audit-table-grants.sql`
   - `fase-2-e2e-audit-default-acl.sql`
   - `fase-2-e2e-audit-policies.sql`
3. Descarga cada resultado como CSV con estos nombres exactos:
   - `fase-2-e2e-function-grants.csv`
   - `fase-2-e2e-table-grants.csv`
   - `fase-2-e2e-default-acl.csv`
   - `fase-2-e2e-policies.csv`
4. Guarda los cuatro archivos en:
   `/home/saza/Proyectos/laboratorio-prestamos-e2e/tests/supabase-e2e-db/`
5. No ejecutes los archivos de auditoría local contra el proyecto E2E.
6. No ejecutes `db push`, `db pull`, `migration repair`, RPC ni SQL de escritura.
7. No modifiques permisos, policies, RLS, tablas o funciones.
8. No copies contraseñas, tokens, JWT, service role keys ni cadenas de conexión.
