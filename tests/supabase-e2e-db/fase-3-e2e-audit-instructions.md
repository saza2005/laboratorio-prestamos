# FASE 3.1 — Instrucciones de auditoría E2E

1. Abre únicamente el proyecto Supabase E2E, identificado como rwni********wwim.
2. Entra en SQL Editor.
3. Ejecuta cada archivo SQL de auditoría por separado.
4. Descarga el resultado con el nombre indicado:

| Archivo SQL | Resultado |
|---|---|
| fase-3-e2e-audit-columns.sql | fase-3-e2e-columns.csv |
| fase-3-e2e-audit-primary-keys.sql | fase-3-e2e-primary-keys.csv |
| fase-3-e2e-audit-foreign-keys.sql | fase-3-e2e-foreign-keys.csv |
| fase-3-e2e-audit-unique-constraints.sql | fase-3-e2e-unique-constraints.csv |
| fase-3-e2e-audit-check-constraints.sql | fase-3-e2e-check-constraints.csv |
| fase-3-e2e-audit-indexes.sql | fase-3-e2e-indexes.csv |
| fase-3-e2e-audit-enums.sql | fase-3-e2e-enums.csv |
| fase-3-e2e-audit-functions.sql | fase-3-e2e-functions.csv |
| fase-3-e2e-audit-function-dependencies.sql | fase-3-e2e-function-dependencies.csv |
| fase-3-e2e-audit-triggers.sql | fase-3-e2e-triggers.csv |
| fase-3-e2e-audit-rls.sql | fase-3-e2e-rls.csv |
| fase-3-e2e-audit-policies.sql | fase-3-e2e-policies.csv |
| fase-3-e2e-audit-table-permissions.sql | fase-3-e2e-table-permissions.csv |

5. Guarda todos los CSV en /home/saza/Proyectos/laboratorio-prestamos-e2e/tests/supabase-e2e-db/.
6. No ejecutes estos archivos en el proyecto normal.
7. No ejecutes migraciones, seeds, RPC, INSERT, UPDATE, DELETE, GRANT ni REVOKE.
8. No modifiques datos o permisos y no copies claves, tokens o cadenas de conexión.
9. Si el SQL Editor muestra un error, conserva el mensaje y no lo reemplaces con un archivo vacío.
