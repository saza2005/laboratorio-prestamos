# FASE 2 — Auditoría estática de la tercera migración

- Ruta: supabase/migrations/20260806001035_harden_all_anon_function_execute.sql
- SHA-256: c8d879e4c107386cca92e0efc328e3a1cc7dfecb97253a12cfc3898368bf2089
- Funciones afectadas: 21
- REVOKE de PUBLIC: 21
- REVOKE de anon: 21
- ALTER DEFAULT PRIVILEGES: 1
- Cambios de tablas: 0
- Cambios de policies: 0
- Cambios de RLS: 0
- Cambios de triggers: 0
- Cambios de cuerpos de funciones: 0
- Cambios de firmas: 0
- Cambios de propietarios: 0
- Operaciones de datos: 0
- RPC ejecutadas: 0

## Alcance

La migración contiene únicamente revocaciones explícitas para las 21 firmas validadas y el ajuste del default ACL de supabase_admin en public para retirar EXECUTE a anon sobre funciones futuras. No contiene permisos de tablas ni modifica las dos migraciones anteriores.

## Resultado de aplicación local

La aplicación se detuvo en el ajuste de default ACL con SQLSTATE 42501 (permission denied to change default privileges). El entorno local no permitió ejecutar esa instrucción bajo el usuario de reconstrucción. No se repitió el reset y no se aplicó ninguna corrección automática.
