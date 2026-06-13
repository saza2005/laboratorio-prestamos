-- PASO 4: reemplazar el inventario de pruebas por el inventario oficial.
-- Ejecutar solo después de que 07_validate_staging.sql devuelva "ready": true.
-- Esta operación conserva profiles, auth.users, policies, tipos y funciones.

begin;

select pg_advisory_xact_lock(20260613, 5606);

do $$
declare
  v_items integer;
  v_units integer;
  v_stock integer;
  v_orphans integer;
  v_mismatches integer;
  v_invalid_items integer;
  v_invalid_units integer;
begin
  select count(*), coalesce(sum(stock_total), 0)
    into v_items, v_stock
  from public.inventory_import_items_staging;

  select count(*) into v_units
  from public.inventory_import_units_staging;

  select count(*) into v_orphans
  from public.inventory_import_units_staging u
  left join public.inventory_import_items_staging i on i.code = u.item_code
  where i.code is null;

  select count(*) into v_mismatches
  from public.inventory_import_items_staging i
  left join (
    select item_code, count(*)::integer as unit_count
    from public.inventory_import_units_staging
    group by item_code
  ) u on u.item_code = i.code
  where i.stock_total <> coalesce(u.unit_count, 0)
     or i.stock_available <> i.stock_total;

  select count(*) into v_invalid_items
  from public.inventory_import_items_staging
  where category is null
     or btrim(category) = ''
     or category = 'PENDIENTE DE CLASIFICAR'
     or item_type <> 'equipment'
     or track_individual is distinct from true
     or status <> 'active'
     or stock_total < 1
     or stock_available < 1;

  select count(*) into v_invalid_units
  from public.inventory_import_units_staging
  where condition <> 'good'
     or availability_status <> 'available'
     or nullif(btrim(asset_code), '') is null
     or nullif(btrim(serial_code), '') is null;

  if v_items <> 730
     or v_units <> 1425
     or v_stock <> 1425
     or v_orphans <> 0
     or v_mismatches <> 0
     or v_invalid_items <> 0
     or v_invalid_units <> 0 then
    raise exception
      'Staging inválido: items=%, units=%, stock=%, orphans=%, mismatches=%, invalid_items=%, invalid_units=%',
      v_items, v_units, v_stock, v_orphans, v_mismatches, v_invalid_items, v_invalid_units;
  end if;

  if exists (
    select 1 from pg_namespace where nspname = 'inventory_backup_20260613'
  ) then
    raise exception
      'El esquema inventory_backup_20260613 ya existe. No se sobrescribirá el respaldo.';
  end if;
end
$$;

create schema inventory_backup_20260613;

create table inventory_backup_20260613.items as table public.items;
create table inventory_backup_20260613.item_units as table public.item_units;
create table inventory_backup_20260613.inventory_movements as table public.inventory_movements;
create table inventory_backup_20260613.maintenance_records as table public.maintenance_records;
create table inventory_backup_20260613.requests as table public.requests;
create table inventory_backup_20260613.request_items as table public.request_items;
create table inventory_backup_20260613.request_groups as table public.request_groups;
create table inventory_backup_20260613.request_group_items as table public.request_group_items;
create table inventory_backup_20260613.loans as table public.loans;
create table inventory_backup_20260613.loan_items as table public.loan_items;
create table inventory_backup_20260613.loan_groups as table public.loan_groups;
create table inventory_backup_20260613.loan_group_items as table public.loan_group_items;
create table inventory_backup_20260613.returns as table public.returns;
create table inventory_backup_20260613.return_items as table public.return_items;

delete from public.return_items;
delete from public.returns;
delete from public.loan_group_items;
delete from public.loan_groups;
delete from public.loan_items;
delete from public.loans;
delete from public.request_group_items;
delete from public.request_groups;
delete from public.request_items;
delete from public.requests;
delete from public.inventory_movements;
delete from public.maintenance_records;
delete from public.item_units;
delete from public.items;

insert into public.items (
  code, name, description, category, item_type, track_individual,
  stock_total, stock_available, status, location
)
select
  btrim(code),
  btrim(name),
  nullif(btrim(description), ''),
  btrim(category),
  item_type::public.item_type,
  track_individual,
  stock_total,
  stock_available,
  status::public.item_status,
  nullif(btrim(location), '')
from public.inventory_import_items_staging
order by code;

insert into public.item_units (
  item_id, serial_code, qr_code, condition, availability_status, notes,
  asset_code, old_code, model, brand, entry_date, assignment_date
)
select
  i.id,
  btrim(u.serial_code),
  btrim(u.asset_code),
  u.condition::public.unit_condition,
  u.availability_status::public.unit_availability,
  nullif(btrim(u.notes), ''),
  btrim(u.asset_code),
  nullif(btrim(u.old_code), ''),
  nullif(btrim(u.model), ''),
  nullif(btrim(u.brand), ''),
  nullif(btrim(u.entry_date), '')::date,
  nullif(btrim(u.assignment_date), '')::date
from public.inventory_import_units_staging u
join public.items i on i.code = btrim(u.item_code)
order by u.asset_code;

do $$
declare
  v_items integer;
  v_units integer;
  v_total_stock integer;
  v_available_stock integer;
  v_orphans integer;
  v_stock_mismatches integer;
begin
  select count(*), coalesce(sum(stock_total), 0), coalesce(sum(stock_available), 0)
    into v_items, v_total_stock, v_available_stock
  from public.items;

  select count(*) into v_units from public.item_units;

  select count(*) into v_orphans
  from public.item_units u
  left join public.items i on i.id = u.item_id
  where i.id is null;

  select count(*) into v_stock_mismatches
  from public.items i
  left join (
    select item_id, count(*)::integer as unit_count
    from public.item_units
    group by item_id
  ) u on u.item_id = i.id
  where i.stock_total <> coalesce(u.unit_count, 0)
     or i.stock_available <> i.stock_total;

  if v_items <> 730
     or v_units <> 1425
     or v_total_stock <> 1425
     or v_available_stock <> 1425
     or v_orphans <> 0
     or v_stock_mismatches <> 0 then
    raise exception
      'Importación inconsistente: items=%, units=%, total_stock=%, available_stock=%, orphans=%, stock_mismatches=%',
      v_items, v_units, v_total_stock, v_available_stock, v_orphans, v_stock_mismatches;
  end if;
end
$$;

commit;
