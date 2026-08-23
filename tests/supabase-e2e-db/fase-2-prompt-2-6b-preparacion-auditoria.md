# FASE 2 — Preparación de auditoría efectiva de permisos

## 1. Archivos remotos generados

- `fase-2-e2e-audit-function-grants.sql`
- `fase-2-e2e-audit-table-grants.sql`
- `fase-2-e2e-audit-default-acl.sql`
- `fase-2-e2e-audit-policies.sql`

Los cuatro contienen exclusivamente consultas SELECT, WITH o VALUES. No contienen DDL, DML, GRANT, REVOKE, CALL ni DO. No fueron ejecutados contra el proyecto E2E.

## 2. Archivos locales generados

- `fase-2-local-function-grants.csv`: 24 funciones
- `fase-2-local-table-grants.csv`: 57 combinaciones tabla/rol
- `fase-2-local-default-acl.csv`: 348 filas expandidas de default ACL
fase-2-local-policies.csv: salida CSV de la consulta de policies; contiene 45 filas lógicas, aunque algunas expresiones multilínea ocupan más líneas físicas.
- `fase-2-local-function-catalog.csv`: catálogo local auxiliar
- `fase-2-local-function-security-matrix.csv`: matriz de 24 funciones

## 3. Conteos locales de permisos

- Funciones con permiso efectivo para anon: 0 de 24
- Tablas con al menos un privilegio SQL efectivo para anon: 19 de 19; RLS habilitado en 19 de 19. La consulta separa privilegios SQL de protección por filas.
Policies public: 45 filas lógicas; algunas expresiones USING/WITH CHECK son multilínea en el CSV.
- Default ACL: se encontraron entradas para funciones, tablas y secuencias; no se observaron entradas para tipos o schemas en el resultado local.

## 4. Funciones locales accesibles por anon

Ninguna función public es ejecutable por anon en el esquema local reconstruido. Las tres RPC endurecidas mantienen `anon=false`, `authenticated=true` y `service_role=true`.

## 5. Tablas locales accesibles por anon

`has_table_privilege` devuelve algún privilegio SQL efectivo para las 19 tablas locales, pero RLS está habilitado en todas y las policies de aplicación están dirigidas a `authenticated`. Esto demuestra que no debe evaluarse un grant de tabla sin revisar simultáneamente RLS y policies.

## 6. Default ACL local

El resultado local contiene defaults expandidos para tablas, secuencias y funciones. Se preparó la consulta remota equivalente para confirmar si el origen de los grants del diff es el default ACL de la plataforma o un cambio manual. No se ejecutó en remoto.

## 7. Problemas detectados

- El diff remoto contiene 21 grants de funciones a anon, mientras que el esquema local tiene 0 funciones ejecutables por anon.
- El diff contiene 6 grants anon de tablas y 3 grants authenticated de tablas.
- El origen exacto no puede clasificarse como default de plataforma sin comparar los cuatro CSV remotos con sus equivalentes locales.
- No se creó migración correctiva y no se modificaron permisos.

## 8. Siguiente paso

Ejecutar personalmente los cuatro SQL en el SQL Editor del proyecto E2E, descargar los CSV con los nombres indicados en `fase-2-e2e-audit-instructions.md` y colocarlos en el directorio del proyecto E2E. Después se podrá comparar permiso por permiso y decidir si existe una exposición real o una diferencia de defaults.
