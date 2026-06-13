# Inventario oficial 2026-06-09

Fuente: `0301115606 - SANCHEZ ARCE JOSE FRANCISCO 09062026.xls`

## Resultado

- Filas inventariables: 1425
- Filas excluidas: 1
- Ítems agrupados: 730
- Unidades individuales: 1425
- Stock total: 1425
- Códigos patrimoniales duplicados: 0

## Asignación

- Código patrimonial existente: 1130
- Firma oficial exacta a grupo existente: 2
- Nombre oficial exacto a grupo existente: 2
- Unidad asignada a grupo nuevo: 291
- Grupos nuevos creados: 119

## Revisión requerida

- Categorías pendientes: 0
- Categorías revisadas y aprobadas: 75
- Grupos con variantes de nombre/modelo: 68
- Modelos faltantes: 3
- Unidades nuevas anexadas a grupos existentes: 4
- Filas excluidas: 1

Las categorías están aprobadas. Antes de importar, seguir exactamente `IMPORT_INSTRUCTIONS.md`.

## Archivos

- `00_source_normalized.csv`: extracción auditada del XLS.
- `01_items_import.csv`: 730 ítems agrupados.
- `02_item_units_staging.csv`: 1.425 unidades patrimoniales.
- `03_review_required.csv`: variantes, modelos faltantes y exclusiones.
- `04_category_suggestions.csv`: categorías revisadas y aprobadas.
- `05_inspect_supabase_schema.sql`: consulta de metadatos previa al SQL de reemplazo.
- `06_prepare_staging_tables.sql`: crea y vacía únicamente las tablas staging.
- `07_validate_staging.sql`: verifica la carga sin modificar el inventario actual.
- `08_replace_inventory_transaction.sql`: respalda y reemplaza los datos dentro de una transacción.
- `09_verify_inventory_import.sql`: verifica el inventario importado.
- `10_restore_previous_data.sql`: restaura el respaldo si fuera necesario.
- `IMPORT_INSTRUCTIONS.md`: orden exacto del proceso.

Las 75 categorías aprobadas ya fueron aplicadas a `01_items_import.csv`.
