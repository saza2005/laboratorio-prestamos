-- PASO 3: validar los CSV después de importarlos a las tablas staging.
-- Solo consulta datos; no modifica el inventario actual.

with metrics as (
  select
    (select count(*) from public.inventory_import_items_staging) as item_count,
    (select count(*) from public.inventory_import_units_staging) as unit_count,
    (select coalesce(sum(stock_total), 0) from public.inventory_import_items_staging) as total_stock,
    (select count(*)
       from public.inventory_import_items_staging
      where category is null
         or btrim(category) = ''
         or category = 'PENDIENTE DE CLASIFICAR') as pending_categories,
    (select count(*)
       from public.inventory_import_units_staging u
       left join public.inventory_import_items_staging i on i.code = u.item_code
      where i.code is null) as orphan_units,
    (select count(*)
       from public.inventory_import_items_staging i
       left join (
         select item_code, count(*)::integer as unit_count
         from public.inventory_import_units_staging
         group by item_code
       ) u on u.item_code = i.code
      where i.stock_total <> coalesce(u.unit_count, 0)
         or i.stock_available <> i.stock_total) as stock_mismatches,
    (select count(*)
       from public.inventory_import_items_staging
      where item_type <> 'equipment'
         or track_individual is distinct from true
         or status <> 'active'
         or stock_total < 1
         or stock_available < 1) as invalid_items,
    (select count(*)
       from public.inventory_import_units_staging
      where condition <> 'good'
         or availability_status <> 'available'
         or nullif(btrim(asset_code), '') is null
         or nullif(btrim(serial_code), '') is null) as invalid_units
)
select jsonb_pretty(
  jsonb_build_object(
    'ready',
      item_count = 730
      and unit_count = 1425
      and total_stock = 1425
      and pending_categories = 0
      and orphan_units = 0
      and stock_mismatches = 0
      and invalid_items = 0
      and invalid_units = 0,
    'expected', jsonb_build_object(
      'items', 730,
      'units', 1425,
      'stock', 1425
    ),
    'actual', to_jsonb(metrics)
  )
) as validation_result
from metrics;
