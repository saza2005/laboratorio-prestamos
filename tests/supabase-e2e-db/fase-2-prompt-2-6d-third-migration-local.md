# FASE 2 — Tercera migración de hardening local

## 1. Estado

- Rama: chore/e2e-supabase-baseline
- Supabase local: activo, reconstrucción fallida al aplicar la tercera migración
- Proyecto remoto enlazado: E2E enlazado previamente, no utilizado en esta tarea
- Operaciones remotas: ninguna
- Migraciones existentes modificadas: no

## 2. Alcance

- Funciones afectadas: 21
- Revocaciones PUBLIC: 21
- Revocaciones anon: 21
- Default ACL: 1 ajuste para supabase_admin, esquema public, funciones futuras, rol anon
- Tablas afectadas: 0
- Policies afectadas: 0
- RLS afectado: 0

## 3. Migración

- Nombre: 20260806001035_harden_all_anon_function_execute.sql
- Timestamp: 20260806001035
- Ruta: supabase/migrations/20260806001035_harden_all_anon_function_execute.sql
- Tamaño: 4628 bytes
- SHA-256: c8d879e4c107386cca92e0efc328e3a1cc7dfecb97253a12cfc3898368bf2089
- Auditoría estática: válida; alcance limitado a las 21 funciones y el default ACL

## 4. Reset local

- Resultado: fallido
- Migraciones aplicadas antes del error: baseline y hardening de las tres RPC
- Migración con error: 20260806001035_harden_all_anon_function_execute.sql
- SQLSTATE: 42501
- Línea/statement: ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon
- Objeto: default ACL de funciones de supabase_admin
- Causa probable: el rol local de reconstrucción no tiene permiso para modificar los privilegios predeterminados de supabase_admin
- Reintentos: no realizados

## 5. Funciones

- Total esperado: 24
- anon antes: 0 localmente
- anon después: no verificado porque el reset falló
- PUBLIC antes: 0 localmente
- PUBLIC después: no verificado porque el reset falló
- authenticated modificado: no previsto; no verificado después
- service_role modificado: no previsto; no verificado después
- SECURITY DEFINER: 19 esperadas según auditoría previa
- Cuerpos modificados: no
- Firmas modificadas: no

## 6. Default ACL

- Entrada peligrosa antes: presente para supabase_admin/public/functions/anon/EXECUTE
- Entrada peligrosa después: no verificada
- Defaults authenticated: no modificados por la propuesta
- Defaults service_role: no modificados por la propuesta

## 7. Regresión

- Tablas: no modificadas por la migración
- Enums: no modificados
- Policies: no modificadas
- RLS: no modificado
- Triggers: no modificados
- Datos: no incluidos
- Permisos de tablas: no modificados
- Cambios inesperados: la aplicación local quedó bloqueada por permisos del default ACL

## 8. Lint

- Errores: no ejecutado porque db reset --local --no-seed falló
- Warnings: no ejecutado
- Warnings nuevos: no determinable
- Ruta: no generada

## 9. Diff local

- Ejecutado: no
- Resultado: no ejecutado por fallo del reset
- Diferencias: no determinables

## 10. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E remoto modificado: no
- SQL remoto: no
- RPC ejecutadas: no
- Secretos mostrados: no
- Staging: no
- Commit: no

## 11. Decisiones diferidas

- Grants de tablas: diferidos
- Staging: requiere decisión funcional separada
- Motivo: no forman parte de esta migración
- Próxima revisión: determinar el propietario/rol de ejecución adecuado para el default ACL local o ajustar la estrategia de migración; no ejecutar push remoto mientras esta validación siga incompleta

## 12. Conclusión

- Migración válida localmente: estáticamente sí; aplicada localmente no
- Hardening confirmado: no confirmado después del reset
- Regresiones: validación incompleta por SQLSTATE 42501
- Lista para dry-run E2E: no
- Siguiente paso: determinar el propietario/rol de ejecución adecuado para el default ACL local o ajustar la estrategia de migración; no ejecutar push remoto mientras esta validación siga incompleta
