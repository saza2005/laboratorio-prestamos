-- PASO 5: verificar el inventario después de ejecutar el reemplazo.
-- Solo consulta datos.

with metrics as (
  select
    (select count(*) from public.items) as item_count,
    (select count(*) from public.item_units) as unit_count,
    (select coalesce(sum(stock_total), 0) from public.items) as total_stock,
    (select coalesce(sum(stock_available), 0) from public.items) as available_stock,
    (select count(*) from (
       select code from public.items group by code having count(*) > 1
     ) duplicates) as duplicate_item_codes,
    (select count(*) from (
       select asset_code from public.item_units where asset_code is not null
       group by asset_code having count(*) > 1
     ) duplicates) as duplicate_asset_codes,
    (select count(*) from (
       select serial_code from public.item_units where serial_code is not null
       group by serial_code having count(*) > 1
     ) duplicates) as duplicate_serial_codes,
    (select count(*) from (
       select qr_code from public.item_units where qr_code is not null
       group by qr_code having count(*) > 1
     ) duplicates) as duplicate_qr_codes,
    (select count(*)
       from public.item_units u
       left join public.items i on i.id = u.item_id
      where i.id is null) as orphan_units,
    (select count(*)
       from public.items i
       left join (
         select item_id, count(*)::integer as unit_count
         from public.item_units group by item_id
       ) u on u.item_id = i.id
      where i.stock_total <> coalesce(u.unit_count, 0)
         or i.stock_available <> i.stock_total) as stock_mismatches,
    (select count(*) from public.items
      where category is null or btrim(category) = ''
         or category = 'PENDIENTE DE CLASIFICAR') as pending_categories,
    (select count(*) from public.items
      where item_type <> 'equipment'
         or track_individual is distinct from true
         or status <> 'active') as invalid_items,
    (select count(*) from public.item_units
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
      and available_stock = 1425
      and duplicate_item_codes = 0
      and duplicate_asset_codes = 0
      and duplicate_serial_codes = 0
      and duplicate_qr_codes = 0
      and orphan_units = 0
      and stock_mismatches = 0
      and pending_categories = 0
      and invalid_items = 0
      and invalid_units = 0,
    'expected', jsonb_build_object('items', 730, 'units', 1425, 'stock', 1425),
    'actual', to_jsonb(metrics),
    'backup_schema_exists', exists (
      select 1 from pg_namespace where nspname = 'inventory_backup_20260613'
    )
  )
) as verification_result
from metrics;

select category, count(*) as item_count, sum(stock_total) as unit_count
from public.items
group by category
order by category;
