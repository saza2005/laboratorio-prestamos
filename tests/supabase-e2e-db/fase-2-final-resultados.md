# FASE 2 — Resultado final

## 1. Migraciones

- Migración base: `20260805220647_baseline_public_schema.sql`
- Migración de hardening: `20260805223410_harden_anon_rpc_execute.sql`
- Versiones locales: `20260805220647`, `20260805223410`
- Versiones remotas: `20260805220647`, `20260805223410`
- Alineación: sí
- Versiones adicionales: ninguna

## 2. Esquema E2E

- Tablas: 19
- Enums: 7
- Funciones: 24
- Policies: 45
- RLS: 19 de 19 tablas
- Triggers: 5
- Diff remoto: no vacío; contiene diferencias de permisos `GRANT` para funciones y tablas, sin aplicar.
- Objetos faltantes: ninguno según los CSV finales
- Objetos adicionales: ninguno según los CSV finales

## 3. Permisos endurecidos

- `register_full_return_transaction(uuid,text,uuid)`: anon `false`, authenticated `true`, service_role `true`
- `register_maintenance_record_transaction(uuid,uuid,text,text,date,text,text,boolean)`: anon `false`, authenticated `true`, service_role `true`
- `update_item_unit_status_transaction(uuid,text,text)`: anon `false`, authenticated `true`, service_role `true`

## 4. Datos

- Tablas verificadas: `profiles`, `items`, `item_units`, `requests`, `request_groups`, `loans`, `loan_groups`, `returns`, `inventory_movements`, `maintenance_records`
- Registros encontrados: 0 en todas las tablas informadas
- Proyecto vacío: sí, sin datos de aplicación
- Datos eliminados: ninguno

## 5. Seguridad

- Proyecto normal modificado: no
- Proyecto E2E modificado durante esta verificación: no
- `db push` repetido: no
- `db reset --linked`: no
- `migration repair`: no
- RPC ejecutadas: no
- Secretos mostrados: no
- Staging: no
- Commit: no

## 6. Conclusión

- FASE 2 completada: no; queda pendiente reconciliar las diferencias de permisos detectadas por `db diff`.
- Proyecto E2E listo para FASE 3: no todavía; el esquema, historial, datos y hardening objetivo están verificados, pero el diff de permisos no está vacío.
- Problemas pendientes: revisar la salida de `fase-2-final-db-diff.txt`. Incluye grants para funciones y tablas, incluyendo acceso `anon`; no ejecutar esa salida sin analizarla.
- Warnings no bloqueantes: los tres warnings locales previos de lint.
- Siguiente paso: auditar y comparar los grants remotos contra la migración base y las políticas RLS; preparar una migración correctiva separada solo si se confirma que los permisos son necesarios y seguros.
