# FASE 2 — Resultado del Prompt 2.3A

## 1. Entorno

- Supabase CLI: 2.111.0
- Docker: disponible; stack local E2E iniciado
- Project ID local: supabase-e2e-db
- Proyecto remoto enlazado: no
- Puertos disponibles antes del inicio: 54321, 54322, 54323 y 54324 libres
- Supabase local iniciado: sí
- API local: iniciada
- Base local: iniciada
- Studio local: iniciado
- Inbucket/Mailpit local: iniciado

## 2. Integridad de la migración

- Archivo: tests/supabase-e2e-db/supabase/migrations/20260805220647_baseline_public_schema.sql
- Hash esperado: c811d14939a6756d4bd98be3172f38a2f1a5e9fe0e91ba972b0957c116ac9ed2
- Hash comprobado: c811d14939a6756d4bd98be3172f38a2f1a5e9fe0e91ba972b0957c116ac9ed2
- Migración modificada: no
- Datos semilla presentes: no; se utilizó --no-seed y no existe seed.sql

## 3. Resultado de db reset local

- Comando: npx supabase db reset --local --no-seed
- Resultado: exitoso
- Migración aplicada: sí, 20260805220647_baseline_public_schema.sql
- Primer error: ninguno
- SQLSTATE: no aplica
- Línea: no aplica
- Objeto: no aplica
- Causa probable: no aplica
- Propuesta mínima sin aplicar: no aplica

## 4. Objetos creados

- Tablas: 19
- Enums: 7
- Funciones: 24
- Policies: 45
- RLS: 19 de 19 tablas
- Triggers: 5 no internos
- Triggers encontrados: trg_item_units_updated_at, trg_items_updated_at, trg_loans_updated_at, trg_profiles_updated_at y trg_requests_updated_at

La expectativa previa de cero triggers no coincide con el archivo real: contiene cinco declaraciones CREATE OR REPLACE TRIGGER. No se agregó ningún trigger durante esta validación.

## 5. Lint

- Ejecutado: sí, db lint --local --schema public --level warning
- Errores: 0
- Warnings: 3 grupos
- Funciones SECURITY DEFINER observadas: 19
- Funciones sin search_path explícito: 0 según la consulta local
- Advertencias: create_inventory_item_transaction tiene dos asignaciones text a enums sin cast explícito; get_dashboard_operational_summary tiene un parámetro no utilizado; register_maintenance_record_transaction tiene una variable no leída
- Ruta de salida: fase-2-db-lint-local.txt

## 6. Diff local

- Ejecutado: sí, db diff --local --schema public --output fase-2-db-diff-local.sql
- Ruta: no se creó archivo porque no hubo diferencias
- Tamaño: no aplica
- SHA-256: no aplica
- Diferencia vacía: sí
- Objetos señalados: ninguno
- Salida: No schema changes found

## 7. Roles y permisos

- anon existe: sí
- authenticated existe: sí
- service_role existe: sí
- Funciones ejecutables por anon: 3
- Funciones ejecutables por authenticated: 19
- Funciones ejecutables por PUBLIC: no se observó una concesión explícita en la consulta de funciones
- Funciones ejecutables por anon: register_full_return_transaction, register_maintenance_record_transaction y update_item_unit_status_transaction
- Riesgos detectados: los grants deben revisarse antes de usar la base para E2E; las funciones SECURITY DEFINER y sus permisos son el principal punto de revisión. No se modificaron permisos.

## 8. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E remoto modificado: no
- Operaciones remotas: ninguna
- Secretos mostrados: no; la CLI imprimió valores locales durante start, pero no se copiaron al informe ni se reproducen aquí
- SQL destructivo remoto: no
- Migración base modificada: no

## 9. Archivos creados

- tests/supabase-e2e-db/fase-2-prompt-2-2-resultados.md
- tests/supabase-e2e-db/fase-2-prompt-2-3a-resultados.md
- tests/supabase-e2e-db/fase-2-db-lint-local.txt
- tests/supabase-e2e-db/fase-2-reset-local.log
- tests/supabase-e2e-db/supabase/.gitignore
- tests/supabase-e2e-db/supabase/config.toml
- tests/supabase-e2e-db/supabase/migrations/20260805220647_baseline_public_schema.sql

No se creó fase-2-db-diff-local.sql porque el diff fue vacío. No se hizo staging ni commit.

## 10. Conclusión

- Migración aplicable localmente: sí
- Migración lista para revisión: sí
- Correcciones necesarias: ninguna para que el reset local funcione; revisar posteriormente las tres advertencias de lint, los grants a anon/authenticated y la discrepancia de triggers
- Siguiente paso recomendado: decidir si los cinco triggers pertenecen al esquema funcional que se desea conservar y revisar los permisos antes de automatizar los flujos E2E
