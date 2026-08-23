begin;

drop policy if exists inventory_movements_select_authenticated
on public.inventory_movements;

create policy inventory_movements_select_staff
on public.inventory_movements
for select
to authenticated
using (public.is_admin_or_lab_staff());

commit;
