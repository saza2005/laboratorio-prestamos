# FASE 2 — Auditoría del diff de permisos

## 1. Archivo analizado

- Ruta: `fase-2-final-db-diff.txt`
- Tamaño: 5683 bytes
- SHA-256: `449bc4427651db58e14e95e9287500708c2f0e4fb4b30727314ae1382c51d700`
- Sentencias totales: 35
- Solo contiene permisos: sí; 35 `GRANT` y 0 `REVOKE`
- Cambios estructurales: no; no aparecen instrucciones SQL efectivas `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `INSERT`, `UPDATE`, `DELETE`, policies, RLS, propietarios ni cuerpos de funciones.

Distribución: 26 grants de funciones y 9 grants de tablas. No hay grants de secuencias.

## 2. Dirección del diff

- Origen: esquema construido desde las migraciones locales, usando una base shadow.
- Destino: proyecto remoto enlazado mediante `--linked`.
- Evidencia: la ayuda de CLI 2.111.0 describe `--linked` como comparar los archivos de migración locales contra el proyecto enlazado; la documentación de Supabase describe `db diff` como la captura de cambios necesarios para que el esquema local coincida con el remoto.
- Significado de los GRANT: el diff representa permisos observados en el remoto que no están representados de la misma forma en la fuente local. No es una orden que se haya ejecutado contra el remoto.

La herramienta no debe interpretarse como una lista para ejecutar automáticamente en producción o E2E. Primero hay que decidir si esos permisos remotos son defaults de plataforma, cambios manuales o exposición innecesaria.

## 3. Resumen

- GRANT de tablas: 9
- GRANT de funciones: 26
- GRANT de secuencias: 0
- REVOKE: 0
- Roles involucrados: `anon`, `authenticated`
- Objetos involucrados: 21 funciones y 6 tablas
- Clasificación del inventario: 13 `EXPOSICION_REAL`, 5 `NECESARIO_APLICACION`, 9 `LEGACY_NO_USADO`, 8 `REQUIERE_CONFIRMACION`.

## 4. Clasificación

- REDUNDANTE_SUPABASE: 0 confirmadas; el diff no aporta evidencia suficiente para afirmar que todos los grants sean redundantes.
- DEFAULT_PLATFORM: 0 confirmados; requiere comparar `pg_default_acl` y ACL efectivos mediante los SQL preparados.
- NECESARIO_APLICACION: 5 grants de funciones a `authenticated`; corresponden a operaciones que la aplicación invoca con sesión o a flujos protegidos.
- EXPOSICION_REAL: 13 grants `GRANT ALL` a `anon` sobre funciones mutacionales. Es una exposición efectiva de privilegio y debe revisarse, aunque el cuerpo de cada función pueda rechazar llamadas sin sesión.
- LEGACY_NO_USADO: 9 grants sobre staging y helpers de trigger/no RPC, sin uso confirmado en la aplicación.
- REQUIERE_CONFIRMACION: 8 grants sobre funciones de lectura/helper o tablas con RLS donde falta confirmar el default de plataforma y el ACL efectivo.

El inventario completo está en `fase-2-grant-diff-inventory.csv`.

## 5. Tablas

| Objeto | Rol | Permisos | RLS/policies | Uso local | Evaluación |
|---|---|---|---|---|---|
| `inventory_import_items_staging` | anon/authenticated | DELETE, INSERT, SELECT, UPDATE | RLS habilitado; tabla temporal | No confirmado en `app/`, `lib/`, `components/` o `tests/` | Legacy; revisar y no exponer anon |
| `inventory_import_units_staging` | anon/authenticated | DELETE, INSERT, SELECT, UPDATE | RLS habilitado; tabla temporal | No confirmado | Legacy; riesgo medio para anon |
| `item_units_import_staging` | anon/authenticated | DELETE, INSERT, SELECT, UPDATE | RLS habilitado; tabla temporal | No confirmado | Legacy; riesgo medio para anon |
| `loan_group_items` | anon | DELETE, INSERT, SELECT, UPDATE | RLS habilitado; policies esperadas para authenticated | Se consulta en préstamos/devoluciones | Requiere confirmación; RLS reduce el acceso efectivo anon |
| `loan_groups` | anon | DELETE, INSERT, SELECT, UPDATE | RLS habilitado; policies esperadas para authenticated | Se consulta en préstamos/devoluciones | Requiere confirmación; grant anon no es necesario para el flujo normal |
| `maintenance_records` | anon | DELETE, INSERT, SELECT, UPDATE | RLS habilitado; policies de staff para authenticated | Se consulta en dashboard, inventario y mantenimiento | Requiere confirmación; grant anon no es necesario para el flujo normal |

Los grants de `authenticated` sobre las tres tablas staging están presentes en el diff, pero su uso en el código no fue confirmado; se clasifican como legacy en el inventario.

RLS y privilegios SQL son capas independientes: el grant no elimina por sí mismo el filtro de RLS, pero un grant anon innecesario aumenta el riesgo si se añade una policy permisiva en el futuro.

## 6. Funciones

El diff contiene grants a `anon` sobre estas funciones mutacionales: `approve_request_transaction`, `cancel_own_request_transaction`, `create_inventory_item_transaction`, `create_loan_transaction`, `create_loan_with_unit_transaction`, `create_multi_item_loan_transaction`, `create_request_transaction`, las dos firmas de `deliver_approved_request_with_units`, `deliver_approved_request`, `increment_stock`, `register_return_transaction` y `reject_request_transaction`.

Todas son operaciones de escritura o administración y deben quedar restringidas a `authenticated` con validación interna de rol/propiedad. El código usa varias desde Server Actions con sesión: creación de solicitudes, aprobación/rechazo, entrega, préstamos y devoluciones.

También aparecen grants anon sobre funciones de lectura/helper: `get_dashboard_inventory_summary`, `get_dashboard_operational_summary`, `get_my_role`, `is_admin_or_lab_staff`, `is_teacher`; y sobre `ensure_google_institutional_profile`, `handle_new_user` y `set_updated_at`. Estas últimas no deben exponerse como RPC públicas sin justificación.

Los cinco grants de funciones a `authenticated` corresponden a permisos utilizados o potencialmente necesarios por los flujos de aplicación. No se recomienda cambiar ninguno en esta auditoría.

Las tres RPC endurecidas no aparecen en el diff:

- `register_full_return_transaction(uuid,text,uuid)`: no vuelve a concederse a anon.
- `register_maintenance_record_transaction(uuid,uuid,text,text,date,text,text,boolean)`: no vuelve a concederse a anon.
- `update_item_unit_status_transaction(uuid,text,text)`: no vuelve a concederse a anon.

## 7. RPC endurecidas

- Alguna vuelve a concederse a anon: no
- Resultado por función: las tres permanecen fuera del diff y conservan el hardening validado (`anon=false`, `authenticated=true`, `service_role=true`).

## 8. Riesgos

- Críticos: ninguno demostrado sin ejecutar una llamada anónima, lo cual está prohibido.
- Altos: grants `GRANT ALL` a `anon` sobre 13 funciones mutacionales; deben confirmarse los controles internos y preferiblemente no formar parte del estado deseado.
- Medios: grants anon sobre tablas de datos y tablas staging, aunque RLS está habilitado; defaults o policies futuras podrían ampliar el impacto.
- Bajos: grants de helpers o trigger y grants authenticated sobre staging no usados.
- No riesgos: no hay DDL, DML, cambios de policies, cambios de RLS, cambios de propietarios ni cambios de cuerpos de funciones en el diff.

## 9. Evaluación de la FASE 2

- Diff funcional: no hay diferencias estructurales; sí hay diferencias de permisos con impacto potencial.
- Diff solo de representación/permisos predeterminados: no puede afirmarse para todos los grants; 13 grants mutacionales a anon no deben descartarse como redundantes.
- Requiere migración correctiva: no crearla todavía; primero se debe confirmar el origen de los ACL y comparar `pg_default_acl`/ACL efectivos mediante las consultas preparadas.
- Puede documentarse como excepción: solo después de confirmar que los grants anon mutacionales son defaults controlados y que las validaciones internas bloquean llamadas sin sesión; actualmente no está demostrado.
- FASE 2 puede cerrarse: no completamente; el esquema e historial están alineados, pero la auditoría de permisos queda pendiente.
- Justificación: el hardening de las tres RPC objetivo está correcto, pero el diff revela otras exposiciones anon que requieren decisión explícita.

## 10. Próximo paso

- Consultas adicionales necesarias: ejecutar en el SQL Editor E2E las consultas de `fase-2-audit-effective-grants-e2e.sql` y comparar con `fase-2-audit-effective-grants-local.sql`, especialmente ACL efectivos, `pg_default_acl`, policies y `has_function_privilege`.
- Cambios propuestos: ninguno todavía; preparar una migración separada solo tras confirmar qué grants son defaults y cuáles deben revocarse.
- Requiere autorización: sí, cualquier cambio de grants remoto.
- Acciones que no deben ejecutarse: aplicar `fase-2-final-db-diff.txt`, `db push`, `db pull`, `migration repair`, SQL de escritura o RPC anónimas.
