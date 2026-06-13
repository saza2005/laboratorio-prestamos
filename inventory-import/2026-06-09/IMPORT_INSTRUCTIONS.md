# Reemplazo controlado del inventario

El archivo XLS original no se modifica. Los CSV de este directorio representan:

- 730 ítems agrupados.
- 1.425 unidades individuales.
- 1.425 unidades de stock total y disponible.

## Orden de ejecución

1. Ejecutar `06_prepare_staging_tables.sql` en Supabase SQL Editor.
2. En Supabase Table Editor, importar `01_items_import.csv` en
   `inventory_import_items_staging`.
3. Importar `02_item_units_staging.csv` en
   `inventory_import_units_staging`.
4. Ejecutar `07_validate_staging.sql`.
5. Continuar únicamente si el resultado contiene `"ready": true` y muestra:
   730 ítems, 1.425 unidades y stock 1.425.
6. Ejecutar completo `08_replace_inventory_transaction.sql`.
7. Ejecutar `09_verify_inventory_import.sql`.
8. Abrir la aplicación y comprobar inventario, solicitudes y mantenimiento.

## Seguridad

El paso 08:

- Usa una única transacción.
- Valida staging antes de eliminar datos.
- Crea el respaldo `inventory_backup_20260613`.
- Conserva `profiles`, `auth.users`, RLS, funciones y tipos.
- Reinicia únicamente inventario e historial operativo de pruebas.
- Hace rollback si los conteos finales no coinciden.

No volver a ejecutar el paso 08 mientras exista el esquema de respaldo. Esta
protección evita sobrescribir el estado anterior.

## Restauración

Si fuera necesario volver al estado anterior, ejecutar
`10_restore_previous_data.sql`. La restauración reemplaza los datos operativos
actuales por el contenido del respaldo.

No eliminar las tablas staging ni el esquema `inventory_backup_20260613` hasta
haber terminado las pruebas funcionales.

No ejecutar manualmente `TRUNCATE`, `DELETE`, `DROP TABLE` ni usar `CASCADE`.
