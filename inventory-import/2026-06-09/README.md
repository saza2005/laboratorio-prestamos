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

- Categorías pendientes: 75
- Grupos con variantes de nombre/modelo: 68
- Modelos faltantes: 3
- Unidades nuevas anexadas a grupos existentes: 4
- Filas excluidas: 1

No importar todavía. Revisar `03_review_required.csv`, especialmente categorías pendientes y grupos con variantes.

## Archivos

- `00_source_normalized.csv`: extracción auditada del XLS.
- `01_items_import.csv`: 730 ítems agrupados.
- `02_item_units_staging.csv`: 1.425 unidades patrimoniales.
- `03_review_required.csv`: variantes, modelos faltantes y exclusiones.
- `04_category_suggestions.csv`: sugerencias no aplicadas; completar `approved_category`.

Las sugerencias de categoría no deben importarse automáticamente: 6 tienen confianza media y 69 baja.
