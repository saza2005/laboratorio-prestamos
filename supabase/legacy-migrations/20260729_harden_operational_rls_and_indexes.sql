-- Endurece RLS operativo y agrega índices para consultas recientes.
-- No elimina datos.

begin;

-- 1. Cerrar tablas de grupos de préstamos.
drop policy if exists "lab_staff manage loan_groups" on public.loan_groups;
drop policy if exists "lab_staff manage loan_group_items" on public.loan_group_items;

revoke all on public.loan_groups from anon;
revoke all on public.loan_group_items from anon;

create policy loan_groups_select_own_or_staff
on public.loan_groups
for select
to authenticated
using (
  public.is_admin_or_lab_staff()
  or exists (
    select 1
    from public.loans l
    where l.id = loan_groups.loan_id
      and l.user_id = auth.uid()
  )
);

create policy loan_groups_manage_staff
on public.loan_groups
for all
to authenticated
using (public.is_admin_or_lab_staff())
with check (public.is_admin_or_lab_staff());

create policy loan_group_items_select_own_or_staff
on public.loan_group_items
for select
to authenticated
using (
  public.is_admin_or_lab_staff()
  or exists (
    select 1
    from public.loan_groups lg
    join public.loans l on l.id = lg.loan_id
    where lg.id = loan_group_items.loan_group_id
      and l.user_id = auth.uid()
  )
);

create policy loan_group_items_manage_staff
on public.loan_group_items
for all
to authenticated
using (public.is_admin_or_lab_staff())
with check (public.is_admin_or_lab_staff());

-- 2. Limitar mantenimiento a admin/lab_staff.
drop policy if exists "Authenticated users can delete maintenance records" on public.maintenance_records;
drop policy if exists "Authenticated users can insert maintenance records" on public.maintenance_records;
drop policy if exists "Authenticated users can update maintenance records" on public.maintenance_records;
drop policy if exists "Authenticated users can view maintenance records" on public.maintenance_records;

revoke all on public.maintenance_records from anon;

create policy maintenance_records_select_staff
on public.maintenance_records
for select
to authenticated
using (public.is_admin_or_lab_staff());

create policy maintenance_records_insert_staff
on public.maintenance_records
for insert
to authenticated
with check (public.is_admin_or_lab_staff());

create policy maintenance_records_update_staff
on public.maintenance_records
for update
to authenticated
using (public.is_admin_or_lab_staff())
with check (public.is_admin_or_lab_staff());

create policy maintenance_records_delete_staff
on public.maintenance_records
for delete
to authenticated
using (public.is_admin_or_lab_staff());

-- 3. Cerrar staging expuesta.
alter table public.item_units_import_staging enable row level security;
revoke all on public.item_units_import_staging from anon;
revoke all on public.item_units_import_staging from authenticated;

-- 4. Índices para dashboard, filtros y listados.
create index if not exists idx_loans_expected_return_date
on public.loans(expected_return_date);

create index if not exists idx_requests_requested_at
on public.requests(requested_at);

create index if not exists idx_maintenance_records_maintenance_date
on public.maintenance_records(maintenance_date);

create index if not exists idx_return_items_created_at
on public.return_items(created_at);

create index if not exists idx_item_units_item_id_availability_status
on public.item_units(item_id, availability_status);

commit;
