# FASE 2 — Resultado del Prompt 2.2

## 1. Fuente

- Ruta del dump: /home/saza/Proyectos/laboratorio-schema-export/public-schema-current.sql
- Tamaño: 134494 bytes
- SHA-256 esperado: c811d14939a6756d4bd98be3172f38a2f1a5e9fe0e91ba972b0957c116ac9ed2
- SHA-256 comprobado: c811d14939a6756d4bd98be3172f38a2f1a5e9fe0e91ba972b0957c116ac9ed2
- Fuente válida: sí
- Datos encontrados: no
- Secretos encontrados: no

## 2. Repositorio

- Repositorio principal modificado: no
- Cambios locales principales preservados: sí
- Worktree: /home/saza/Proyectos/laboratorio-prestamos-e2e
- Rama: chore/e2e-supabase-baseline
- Estado inicial del worktree: limpio
- Estado final del worktree: archivos locales nuevos sin staging ni commit

## 3. Proyecto Supabase E2E local

- Directorio: /home/saza/Proyectos/laboratorio-prestamos-e2e/tests/supabase-e2e-db
- supabase init ejecutado: sí
- Project ID local de config.toml: supabase-e2e-db
- Proyecto remoto enlazado: no
- Proyecto normal modificado: no
- Proyecto E2E remoto modificado: no
- Archivo seed local: no creado; no hay datos semilla

## 4. Migración base

- Nombre del archivo: 20260805220647_baseline_public_schema.sql
- Timestamp: 20260805220647
- Ruta: /home/saza/Proyectos/laboratorio-prestamos-e2e/tests/supabase-e2e-db/supabase/migrations/20260805220647_baseline_public_schema.sql
- Tamaño: 134494 bytes
- SHA-256: c811d14939a6756d4bd98be3172f38a2f1a5e9fe0e91ba972b0957c116ac9ed2
- Coincide exactamente con el dump: sí; cmp devolvió 0
- Modificaciones respecto al dump: ninguna

## 5. Objetos

- CREATE TABLE: 19
- CREATE TYPE: 7
- Funciones: 24 mediante CREATE OR REPLACE FUNCTION
- CREATE POLICY: 45
- CREATE INDEX: 24
- ENABLE ROW LEVEL SECURITY: 19
- Foreign keys: 32
- CHECK: 45
- UNIQUE: 6
- CREATE TRIGGER: 0

## 6. Dependencias externas

- Referencias a auth.uid: 17
- Referencias a auth.jwt: 3
- Referencias a auth.users: 0
- Referencias a authenticator: 0
- Referencias a authenticated: 84
- Referencias a anon: 20
- Referencias a service_role: 47 como rol textual de PostgreSQL
- Referencias a storage: 0
- Referencias a extensions: 0
- Referencias a pg_catalog: 1
- Roles Supabase referenciados: authenticated, anon y service_role
- Extensiones requeridas explícitamente: ninguna mediante CREATE EXTENSION
- Funciones SECURITY DEFINER: 19 declaraciones
- Funciones con SET search_path explícito: 0
- Funciones que devuelven tipo trigger: presentes en el dump, pero no se asociaron a triggers nuevos

## 7. Revisión de riesgo

- SQL destructivo: no detectado
- Datos semilla: no
- COPY FROM stdin: no
- INSERT fuera de funciones: no
- UPDATE fuera de funciones: no
- DELETE fuera de funciones: no
- DROP TABLE: no
- DROP SCHEMA: no
- TRUNCATE: no
- CREATE SCHEMA: 1, correspondiente al esquema public
- ALTER SCHEMA: 1
- ALTER OWNER: 51
- GRANT: 98
- REVOKE: 24
- ALTER DEFAULT PRIVILEGES: 12
- CREATE EXTENSION: 0
- \restrict/\unrestrict: no detectadas
- Elementos que requieren validación local: permisos, propietarios, funciones SECURITY DEFINER y compatibilidad de roles al ejecutar Supabase local

## 8. Archivos creados o modificados

- tests/supabase-e2e-db/supabase/config.toml: configuración local generada por supabase init
- tests/supabase-e2e-db/supabase/.gitignore: exclusiones locales generadas por supabase init
- tests/supabase-e2e-db/supabase/migrations/20260805220647_baseline_public_schema.sql: copia exacta del dump validado
- tests/supabase-e2e-db/fase-2-prompt-2-2-resultados.md: este informe

No se modificaron las migraciones históricas del repositorio principal. No se hizo staging ni commit.

## 9. Conclusión

- Migración lista para validación local: sí, como artefacto estático
- Problemas encontrados: la migración contiene permisos, propietarios y funciones SECURITY DEFINER que deben validarse al iniciar Supabase local; no contiene triggers, por lo que no se agregaron
- Cambios pendientes: ejecutar una validación local controlada en una siguiente fase
- Siguiente paso recomendado: revisar este informe y, con autorización, iniciar Supabase local y probar db reset local; todavía no se ejecutó
