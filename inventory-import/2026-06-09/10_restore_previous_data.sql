-- RESTAURACIÓN OPCIONAL.
-- Revierte inventario e historial de pruebas al respaldo creado por el paso 08.
-- Ejecutar únicamente si se necesita deshacer la importación oficial.

begin;

select pg_advisory_xact_lock(20260613, 5606);

do $$
begin
  if not exists (
    select 1 from pg_namespace where nspname = 'inventory_backup_20260613'
  ) then
    raise exception 'No existe el esquema inventory_backup_20260613.';
  end if;
end
$$;

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
  id, code, name, description, category, item_type, track_individual,
  stock_total, stock_available, status, location, created_by, created_at, updated_at
)
select
  id, code, name, description, category, item_type, track_individual,
  stock_total, stock_available, status, location, created_by, created_at, updated_at
from inventory_backup_20260613.items;

insert into public.item_units (
  id, item_id, serial_code, qr_code, condition, availability_status, notes,
  created_at, updated_at, asset_code, old_code, model, brand, entry_date, assignment_date
)
select
  id, item_id, serial_code, qr_code, condition, availability_status, notes,
  created_at, updated_at, asset_code, old_code, model, brand, entry_date, assignment_date
from inventory_backup_20260613.item_units;

insert into public.requests (
  id, user_id, requested_at, status, purpose, comments, scheduled_return_date,
  approved_by, approved_at, rejection_reason, created_at, updated_at
)
select
  id, user_id, requested_at, status, purpose, comments, scheduled_return_date,
  approved_by, approved_at, rejection_reason, created_at, updated_at
from inventory_backup_20260613.requests;

insert into public.request_items (
  id, request_id, item_id, quantity_requested, quantity_approved,
  quantity_delivered, quantity_returned, quantity_damaged, created_at
)
select
  id, request_id, item_id, quantity_requested, quantity_approved,
  quantity_delivered, quantity_returned, quantity_damaged, created_at
from inventory_backup_20260613.request_items;

insert into public.request_groups (id, request_id, group_name, leader_student_id, created_at)
select id, request_id, group_name, leader_student_id, created_at
from inventory_backup_20260613.request_groups;

insert into public.request_group_items (id, request_group_id, item_id, quantity)
select id, request_group_id, item_id, quantity
from inventory_backup_20260613.request_group_items;

insert into public.loans (
  id, request_id, user_id, delivered_by, delivery_date, expected_return_date,
  returned_at, status, notes, created_at, updated_at
)
select
  id, request_id, user_id, delivered_by, delivery_date, expected_return_date,
  returned_at, status, notes, created_at, updated_at
from inventory_backup_20260613.loans;

insert into public.loan_items (
  id, loan_id, item_id, item_unit_id, quantity, returned_quantity,
  damaged_quantity, created_at, missing_quantity
)
select
  id, loan_id, item_id, item_unit_id, quantity, returned_quantity,
  damaged_quantity, created_at, missing_quantity
from inventory_backup_20260613.loan_items;

insert into public.loan_groups (
  id, loan_id, request_group_id, group_name, leader_student_id, created_at
)
select id, loan_id, request_group_id, group_name, leader_student_id, created_at
from inventory_backup_20260613.loan_groups;

insert into public.loan_group_items (id, loan_group_id, item_id, quantity, created_at)
select id, loan_group_id, item_id, quantity, created_at
from inventory_backup_20260613.loan_group_items;

insert into public.returns (id, loan_id, received_by, received_at, notes, created_at)
select id, loan_id, received_by, received_at, notes, created_at
from inventory_backup_20260613.returns;

insert into public.return_items (
  id, return_id, loan_item_id, quantity_ok, quantity_damaged,
  quantity_missing, notes, created_at
)
select
  id, return_id, loan_item_id, quantity_ok, quantity_damaged,
  quantity_missing, notes, created_at
from inventory_backup_20260613.return_items;

insert into public.inventory_movements (
  id, item_id, movement_type, quantity, reference_table, reference_id,
  notes, created_by, created_at
)
select
  id, item_id, movement_type, quantity, reference_table, reference_id,
  notes, created_by, created_at
from inventory_backup_20260613.inventory_movements;

insert into public.maintenance_records (
  id, item_id, activity, responsible, maintenance_date, observations,
  maintenance_type, created_by, created_at
)
select
  id, item_id, activity, responsible, maintenance_date, observations,
  maintenance_type, created_by, created_at
from inventory_backup_20260613.maintenance_records;

commit;
