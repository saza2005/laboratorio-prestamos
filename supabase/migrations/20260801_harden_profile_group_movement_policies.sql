-- Endurece policies para evitar escalamiento de roles, grupos estudiantiles y movimientos falsos.
-- No elimina datos ni modifica tablas.

begin;

-- 1. Los usuarios no pueden modificar su propio perfil ni su rol.
drop policy if exists profiles_update_own_or_staff
on public.profiles;

create policy profiles_update_staff
on public.profiles
for update
to authenticated
using (public.is_admin_or_lab_staff())
with check (public.is_admin_or_lab_staff());

-- 2. Solo docentes pueden crear grupos dentro de sus solicitudes.
drop policy if exists request_groups_insert_own_request
on public.request_groups;

create policy request_groups_insert_teacher_own_request
on public.request_groups
for insert
to authenticated
with check (
  public.is_teacher()
  and exists (
    select 1
    from public.requests r
    where r.id = request_groups.request_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists request_group_items_insert_own_request_group
on public.request_group_items;

create policy request_group_items_insert_teacher_own_request_group
on public.request_group_items
for insert
to authenticated
with check (
  public.is_teacher()
  and exists (
    select 1
    from public.request_groups rg
    join public.requests r on r.id = rg.request_id
    where rg.id = request_group_items.request_group_id
      and r.user_id = auth.uid()
  )
);

-- 3. Solo admin/lab_staff pueden insertar movimientos directamente.
-- Las funciones transaccionales SECURITY DEFINER conservan la operación interna.
drop policy if exists inventory_movements_insert_authenticated
on public.inventory_movements;

create policy inventory_movements_insert_staff
on public.inventory_movements
for insert
to authenticated
with check (
  public.is_admin_or_lab_staff()
  and auth.uid() = created_by
);

commit;
