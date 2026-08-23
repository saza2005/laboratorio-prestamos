# FASE 2 — Tercera migración corregida

## 1. Evidencia preservada

- Archivo original: manual/20260806001035_harden_all_anon_function_execute.failed.sql
- Hash: c8d879e4c107386cca92e0efc328e3a1cc7dfecb97253a12cfc3898368bf2089
- Copia: sí, fuera de supabase/migrations
- Hash de copia: c8d879e4c107386cca92e0efc328e3a1cc7dfecb97253a12cfc3898368bf2089

## 2. Corrección

- Statement retirado: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon
- Motivo: SQLSTATE 42501 en el ejecutor local; el default ACL es gestionado por la plataforma
- Funciones afectadas: 21
- Revocaciones PUBLIC: 21
- Revocaciones anon: 21
- Default ACL modificado: no
- Tablas modificadas: 0

## 3. Migración corregida

- Ruta: supabase/migrations/20260806001035_harden_all_anon_function_execute.sql
- Tamaño: 4641 bytes
- SHA-256: 96da4fd5087b740936607fe1003c5bedf85b6e718818c8cb7bc44bf5740e402e
- Auditoría estática: 21 revocaciones PUBLIC, 21 revocaciones anon, 0 ALTER DEFAULT PRIVILEGES, 0 GRANT, 0 operaciones de datos

## 4. Reset local

- Resultado: exitoso
- Migraciones aplicadas: baseline, hardening de las tres RPC y hardening completo corregido
- Error: ninguno
- SQLSTATE: ninguno

## 5. Permisos

- Funciones: 24
- PUBLIC: 0 ejecutables
- anon: 0 ejecutables
- authenticated: 19 antes y 19 después; sin cambios
- service_role: 24 antes y 24 después; sin cambios
- Funciones modificadas inesperadamente: ninguna
- SECURITY DEFINER: 19
- SECURITY DEFINER sin search_path seguro: 0
- Cuerpos, firmas, propietarios y configuraciones: sin cambios

## 6. Default ACL

- Entrada gestionada por plataforma: supabase_admin/public/functions/anon/EXECUTE permanece presente
- Modificada: no
- Riesgo actual: las futuras funciones podrían heredar el permiso si no incluyen revocaciones explícitas
- Control compensatorio: revocaciones PUBLIC y anon obligatorias por función, verificadas por script estático
- Archivo de excepción: fase-2-default-acl-platform-exception.md

## 7. Comprobación estática

- Script: scripts/check-function-execute-hardening.mjs
- Resultado: PASS, código de salida 0
- Incumplimientos: ninguno
- Limitaciones: como las funciones se crean en el dump base y se endurecen en migraciones posteriores, el script valida por firma sobre el conjunto completo de migraciones, no exige que la revocación esté en el mismo archivo del CREATE FUNCTION
- Salida: fase-2-function-hardening-static-check.txt

## 8. Regresión

- Tablas: 19
- Enums: 7
- Policies: 45
- RLS: 19/19
- Triggers: 5
- Datos: profiles, items, requests, loans y returns en 0 registros
- Permisos de tablas: no modificados
- Regresiones: ninguna detectada

## 9. Lint y diff

- Errores: 0
- Warnings: 3 grupos previos
- Warnings nuevos: 0
- Diff local: vacío, No schema changes found
- Lint: fase-2-db-lint-after-corrected-hardening.txt
- Diff: fase-2-db-diff-after-corrected-hardening.txt

## 10. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E remoto modificado: no
- Operaciones remotas: ninguna
- RPC: ninguna ejecutada
- Secretos: no mostrados
- Staging: no
- Commit: no

## 11. Conclusión

- Migración válida localmente: sí
- Funciones actuales endurecidas: sí, 24/24 sin EXECUTE para PUBLIC ni anon
- Default ACL diferido: sí, documentado como excepción de plataforma
- Lista para dry-run E2E: sí, pendiente de autorización explícita
- Siguiente paso: revisar el dry-run remoto y confirmar que solo se propone la tercera migración corregida
