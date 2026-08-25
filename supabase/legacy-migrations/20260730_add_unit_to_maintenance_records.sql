alter table public.maintenance_records
  add column if not exists item_unit_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'maintenance_records_item_unit_id_fkey'
  ) then
    alter table public.maintenance_records
      add constraint maintenance_records_item_unit_id_fkey
      foreign key (item_unit_id)
      references public.item_units(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_maintenance_records_item_unit_id
on public.maintenance_records(item_unit_id);

notify pgrst, 'reload schema';
