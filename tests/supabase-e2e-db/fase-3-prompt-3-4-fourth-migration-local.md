# FASE 3 — Cuarta migración de permisos legacy

## 1. Estado inicial

- Rama: chore/e2e-supabase-baseline
- Migraciones existentes: 3 verificadas sin cambios
- Operaciones remotas: ninguna
- Proyecto E2E: enlazado, no utilizado en esta tarea
- Proyecto normal: no modificado

## 2. Alcance

- Funciones: 5
- Revocaciones authenticated: 5
- PUBLIC: 0
- anon: 0
- service_role: 0
- Tablas: 0
- Policies: 0
- RLS: 0
- Datos: 0

## 3. Migración

- Nombre: 20260806154909_revoke_authenticated_legacy_rpcs.sql
- Timestamp: 20260806154909
- Ruta: supabase/migrations/20260806154909_revoke_authenticated_legacy_rpcs.sql
- Tamaño: 1286 bytes
- SHA-256: 1286760da7ba8a7f35f50c3d111876f6de86df74f8c7c4f1c77967adfc8d4ba3
- Auditoría estática: 5 revocaciones authenticated; cero GRANT, PUBLIC, anon, service_role, default ACL, DDL o DML.

## 4. Reset local

- Resultado: exitoso
- Migraciones aplicadas: las cuatro migraciones, en orden
- Error: ninguno
- SQLSTATE: ninguno
- Objeto: ninguno

## 5. Permisos

- Funciones public: 24
- PUBLIC ejecutables: 0
- anon ejecutables: 0
- authenticated ejecutables: 19
- service_role ejecutables: 24
- SECURITY DEFINER: 19
- Cinco funciones legacy: todas PUBLIC=false, anon=false, authenticated=false, service_role=true.
- RPC activas: create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid) y deliver_approved_request_with_units(uuid, jsonb, jsonb, uuid, text) conservan authenticated=true y service_role=true; PUBLIC/anon=false.
- Cambios inesperados: ninguno.

## 6. Regresión

- Tablas: 19
- Columnas: 170
- PK: 18
- FK: 32
- UNIQUE: 6
- CHECK: 19
- Índices: 48
- Enums: 7
- Valores enum: 33
- Funciones: 24
- Policies: 45
- RLS: 19/19
- Triggers: 5
- Datos: 0
- Cuerpos o firmas modificados: no
- Permisos de tablas modificados: no

## 7. Validaciones

- Comprobación estática: exitosa, código 0; 24/24 funciones de aplicación con revocaciones PUBLIC y anon agregadas en el conjunto de migraciones.
- Lint: 0 errores.
- Warnings: los tres grupos previos, sin warnings nuevos.
- Diff local: vacío, No schema changes found.
- Referencias activas legacy: no; las referencias encontradas en reportes y migraciones no son llamadas runtime.
- Sobrecarga importante: la firma de cuatro argumentos no es la activa; la aplicación usa la firma de cinco argumentos con p_items.

## 8. Pruebas diferidas

- Archivo: fase-3-legacy-rpc-flow-tests-deferred.md
- Motivo: no existen usuarios ni datos E2E.
- Flujos: préstamo multi-item, préstamo con unidades, entrega parcial/completa, inventario y devolución.

## 9. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E remoto modificado: no
- Operaciones remotas: ninguna
- RPC ejecutadas: ninguna
- Permisos de tablas: no modificados
- Secretos: no mostrados
- Staging: no
- Commit: no

## 10. Conclusión

- Migración válida localmente: sí
- Equivalencia de permisos alcanzable: sí, revocando en E2E los cinco grants authenticated legacy
- Regresiones: no detectadas
- Lista para dry-run E2E: sí
- Proyecto E2E listo para datos: no todavía; falta ejecutar el dry-run y posteriormente aplicar la migración con autorización separada
- Siguiente paso: dry-run remoto de la cuarta migración; no ejecutar push en esta fase.
