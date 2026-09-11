-- Cierre de escalamiento de privilegios y aplicación uniforme de is_active.
-- Esta migración no modifica datos existentes ni se aplica automáticamente.

begin;

-- ---------------------------------------------------------------------------
-- Helpers de autorización. Todos ignoran perfiles inexistentes o inactivos.
-- ---------------------------------------------------------------------------

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.is_active is true
  );
$$;

create or replace function public.is_admin_or_lab_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.is_active is true
      and profile.role in ('admin'::public.user_role, 'lab_staff'::public.user_role)
  );
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.is_active is true
      and profile.role = 'teacher'::public.user_role
  );
$$;

create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.is_active is true
$$;

create or replace function public.assert_active_role(p_allowed_roles text[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.is_active is true
      and profile.role::text = any(p_allowed_roles)
  ) then
    raise exception 'Cuenta inactiva o sin permisos para esta operación.';
  end if;
end;
$$;

revoke all on function public.is_active_user() from public, anon;
revoke all on function public.is_admin_or_lab_staff() from public, anon;
revoke all on function public.is_teacher() from public, anon;
revoke all on function public.get_my_role() from public, anon;
revoke all on function public.assert_active_role(text[]) from public, anon, authenticated, service_role;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin_or_lab_staff() to authenticated;
grant execute on function public.is_teacher() to authenticated;
grant execute on function public.get_my_role() to authenticated;

-- Estas funciones ya califican todas sus relaciones; el search_path vacío es
-- compatible sin reescribir lógica funcional probada.
alter function public.cancel_own_request_transaction(uuid) set search_path = '';
alter function public.get_dashboard_inventory_summary() set search_path = '';
alter function public.get_dashboard_operational_summary(date, date, date, date) set search_path = '';

-- ---------------------------------------------------------------------------
-- Alta OAuth segura. La identidad se deriva de auth.uid()/auth.jwt(); el cliente
-- no puede elegir id, role ni is_active. Un correo existente con otro UUID no
-- se religa automáticamente.
-- ---------------------------------------------------------------------------

create or replace function public.ensure_google_institutional_profile()
returns table(profile_role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(nullif(btrim(auth.jwt() ->> 'email'), ''));
  v_full_name text := nullif(
    btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name', '')),
    ''
  );
  v_existing_role public.user_role;
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  if coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') <> 'google' then
    raise exception 'El perfil debe crearse mediante Google OAuth.';
  end if;

  if v_email is null or v_email !~ '^[^[:space:]@]+@ucuenca[.]edu[.]ec$' then
    raise exception 'Solo se permiten correos institucionales @ucuenca.edu.ec';
  end if;

  select profile.role
    into v_existing_role
  from public.profiles as profile
  where profile.id = v_user_id;

  if found then
    profile_role := v_existing_role::text;
    return next;
    return;
  end if;

  if exists (
    select 1
    from public.profiles as profile
    where lower(profile.email) = v_email
      and profile.id <> v_user_id
  ) then
    raise exception 'El correo institucional ya está vinculado a otro perfil.';
  end if;

  insert into public.profiles (id, full_name, email, role, is_active)
  values (
    v_user_id,
    left(coalesce(v_full_name, split_part(v_email, '@', 1)), 120),
    v_email,
    'student'::public.user_role,
    true
  )
  returning role::text into profile_role;

  return next;
end;
$$;

drop policy if exists profiles_insert_own on public.profiles;
revoke insert, update, delete on public.profiles from authenticated;
revoke all on public.profiles from anon;

revoke all on function public.ensure_google_institutional_profile() from public, anon, service_role;
grant execute on function public.ensure_google_institutional_profile() to authenticated;

-- La lectura del perfil propio se conserva para que una cuenta inactiva pueda
-- conocer exclusivamente su estado. Las demás policies usan helpers activos.

-- ---------------------------------------------------------------------------
-- RLS: una sesión válida sin perfil activo no obtiene datos operacionales.
-- ---------------------------------------------------------------------------

drop policy if exists "Allow admin insert units" on public.item_units;
create policy "Allow admin insert units"
on public.item_units for insert to authenticated
with check (public.is_admin_or_lab_staff());

drop policy if exists item_units_select_authenticated on public.item_units;
create policy item_units_select_authenticated
on public.item_units for select to authenticated
using (public.is_active_user());

drop policy if exists items_select_authenticated on public.items;
create policy items_select_authenticated
on public.items for select to authenticated
using (public.is_active_user());

drop policy if exists loans_select_own_or_staff on public.loans;
create policy loans_select_own_or_staff
on public.loans for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (public.is_active_user() and user_id = auth.uid())
);

drop policy if exists loan_items_select_own_or_staff on public.loan_items;
create policy loan_items_select_own_or_staff
on public.loan_items for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (
    public.is_active_user()
    and exists (
      select 1 from public.loans as loan
      where loan.id = loan_items.loan_id
        and loan.user_id = auth.uid()
    )
  )
);

drop policy if exists loan_groups_select_own_or_staff on public.loan_groups;
create policy loan_groups_select_own_or_staff
on public.loan_groups for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (
    public.is_active_user()
    and exists (
      select 1 from public.loans as loan
      where loan.id = loan_groups.loan_id
        and loan.user_id = auth.uid()
    )
  )
);

drop policy if exists loan_group_items_select_own_or_staff on public.loan_group_items;
create policy loan_group_items_select_own_or_staff
on public.loan_group_items for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (
    public.is_active_user()
    and exists (
      select 1
      from public.loan_groups as loan_group
      join public.loans as loan on loan.id = loan_group.loan_id
      where loan_group.id = loan_group_items.loan_group_id
        and loan.user_id = auth.uid()
    )
  )
);

drop policy if exists requests_insert_own on public.requests;
create policy requests_insert_own
on public.requests for insert to authenticated
with check (public.is_active_user() and user_id = auth.uid());

drop policy if exists requests_select_own_or_staff on public.requests;
create policy requests_select_own_or_staff
on public.requests for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (public.is_active_user() and user_id = auth.uid())
);

drop policy if exists request_items_insert_own_or_staff on public.request_items;
create policy request_items_insert_own_or_staff
on public.request_items for insert to authenticated
with check (
  public.is_admin_or_lab_staff()
  or (
    public.is_active_user()
    and exists (
      select 1 from public.requests as request
      where request.id = request_items.request_id
        and request.user_id = auth.uid()
    )
  )
);

drop policy if exists request_items_select_own_or_staff on public.request_items;
create policy request_items_select_own_or_staff
on public.request_items for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (
    public.is_active_user()
    and exists (
      select 1 from public.requests as request
      where request.id = request_items.request_id
        and request.user_id = auth.uid()
    )
  )
);

drop policy if exists request_groups_select_own_or_staff on public.request_groups;
create policy request_groups_select_own_or_staff
on public.request_groups for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (
    public.is_active_user()
    and exists (
      select 1 from public.requests as request
      where request.id = request_groups.request_id
        and request.user_id = auth.uid()
    )
  )
);

drop policy if exists request_group_items_select_own_or_staff on public.request_group_items;
create policy request_group_items_select_own_or_staff
on public.request_group_items for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (
    public.is_active_user()
    and exists (
      select 1
      from public.request_groups as request_group
      join public.requests as request on request.id = request_group.request_id
      where request_group.id = request_group_items.request_group_id
        and request.user_id = auth.uid()
    )
  )
);

drop policy if exists returns_select_own_or_staff on public.returns;
create policy returns_select_own_or_staff
on public.returns for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (
    public.is_active_user()
    and exists (
      select 1 from public.loans as loan
      where loan.id = returns.loan_id
        and loan.user_id = auth.uid()
    )
  )
);

drop policy if exists return_items_select_own_or_staff on public.return_items;
create policy return_items_select_own_or_staff
on public.return_items for select to authenticated
using (
  public.is_admin_or_lab_staff()
  or (
    public.is_active_user()
    and exists (
      select 1
      from public.returns as return_record
      join public.loans as loan on loan.id = return_record.loan_id
      where return_record.id = return_items.return_id
        and loan.user_id = auth.uid()
    )
  )
);

-- Anon no necesita privilegios sobre ninguna tabla operacional. RLS permanece
-- como segunda barrera; authenticated conserva sus consultas protegidas.
revoke all on table
  public.audit_logs,
  public.inventory_movements,
  public.item_units,
  public.items,
  public.loan_group_items,
  public.loan_groups,
  public.loan_items,
  public.loans,
  public.maintenance_records,
  public.request_group_items,
  public.request_groups,
  public.request_items,
  public.requests,
  public.return_items,
  public.returns
from anon;

-- El código activo no escribe tablas con PostgREST: toda mutación pasa por una
-- RPC transaccional. authenticated solo necesita SELECT directo sujeto a RLS.
revoke all on table
  public.audit_logs,
  public.inventory_movements,
  public.item_units,
  public.items,
  public.loan_group_items,
  public.loan_groups,
  public.loan_items,
  public.loans,
  public.maintenance_records,
  public.profiles,
  public.request_group_items,
  public.request_groups,
  public.request_items,
  public.requests,
  public.return_items,
  public.returns
from authenticated;

grant select on table
  public.audit_logs,
  public.inventory_movements,
  public.item_units,
  public.items,
  public.loan_group_items,
  public.loan_groups,
  public.loan_items,
  public.loans,
  public.maintenance_records,
  public.profiles,
  public.request_group_items,
  public.request_groups,
  public.request_items,
  public.requests,
  public.return_items,
  public.returns
to authenticated;

revoke all on all sequences in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guardia uniforme para RPC operativas que históricamente solo comprobaban rol.
-- Se conserva cada implementación probada, pero se revoca su ejecución directa.
-- ---------------------------------------------------------------------------

alter function public.approve_request_transaction(uuid, jsonb)
  rename to approve_request_transaction_security_impl_20260910;
alter function public.create_inventory_item_transaction(text, text, text, text, text, boolean, integer, integer, text, text, text[])
  rename to create_inventory_item_transaction_security_impl_20260910;
alter function public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid)
  rename to create_multi_item_loan_transaction_security_impl_20260910;
alter function public.create_request_transaction(text, text, date, jsonb, jsonb)
  rename to create_request_transaction_security_impl_20260910;
alter function public.deliver_approved_request_with_units(uuid, jsonb, jsonb, uuid, text)
  rename to deliver_approved_request_with_units_security_impl_20260910;
alter function public.register_full_return_transaction(uuid, text, uuid)
  rename to register_full_return_transaction_security_impl_20260910;
alter function public.register_maintenance_record_transaction(uuid, uuid, text, text, date, text, text, boolean)
  rename to register_maintenance_record_transaction_security_impl_20260910;
alter function public.register_return_transaction(uuid, integer, integer, integer, text, uuid)
  rename to register_return_transaction_security_impl_20260910;
alter function public.reject_request_transaction(uuid, text)
  rename to reject_request_transaction_security_impl_20260910;
alter function public.update_item_unit_status_transaction(uuid, text, text)
  rename to update_item_unit_status_transaction_security_impl_20260910;

create function public.approve_request_transaction(p_request_id uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);
  perform public.approve_request_transaction_security_impl_20260910(p_request_id, p_items);
end;
$$;

create function public.create_inventory_item_transaction(
  p_code text, p_name text, p_description text, p_category text, p_item_type text,
  p_track_individual boolean, p_stock_total integer, p_stock_available integer,
  p_status text, p_location text, p_asset_codes text[] default array[]::text[]
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);
  return public.create_inventory_item_transaction_security_impl_20260910(
    p_code, p_name, p_description, p_category, p_item_type, p_track_individual,
    p_stock_total, p_stock_available, p_status, p_location, p_asset_codes
  );
end;
$$;

create function public.create_multi_item_loan_transaction(
  p_user_id uuid, p_items jsonb, p_expected_return_date date,
  p_notes text, p_delivered_by uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);
  return public.create_multi_item_loan_transaction_security_impl_20260910(
    p_user_id, p_items, p_expected_return_date, p_notes, p_delivered_by
  );
end;
$$;

create function public.create_request_transaction(
  p_purpose text, p_comments text, p_scheduled_return_date date,
  p_items jsonb, p_groups jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['teacher', 'student']);
  return public.create_request_transaction_security_impl_20260910(
    p_purpose, p_comments, p_scheduled_return_date, p_items, p_groups
  );
end;
$$;

create function public.deliver_approved_request_with_units(
  p_request_id uuid, p_units jsonb, p_items jsonb,
  p_delivered_by uuid, p_notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);
  return public.deliver_approved_request_with_units_security_impl_20260910(
    p_request_id, p_units, p_items, p_delivered_by, p_notes
  );
end;
$$;

create function public.register_full_return_transaction(
  p_loan_id uuid, p_notes text default null, p_received_by uuid default auth.uid()
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);
  return public.register_full_return_transaction_security_impl_20260910(
    p_loan_id, p_notes, p_received_by
  );
end;
$$;

create function public.register_maintenance_record_transaction(
  p_item_id uuid, p_item_unit_id uuid, p_activity text, p_responsible text,
  p_maintenance_date date, p_observations text, p_maintenance_type text,
  p_mark_unit_unavailable boolean default false
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);
  return public.register_maintenance_record_transaction_security_impl_20260910(
    p_item_id, p_item_unit_id, p_activity, p_responsible, p_maintenance_date,
    p_observations, p_maintenance_type, p_mark_unit_unavailable
  );
end;
$$;

create function public.register_return_transaction(
  p_loan_item_id uuid, p_quantity_ok integer, p_quantity_damaged integer,
  p_quantity_missing integer, p_notes text default null,
  p_received_by uuid default auth.uid()
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);
  return public.register_return_transaction_security_impl_20260910(
    p_loan_item_id, p_quantity_ok, p_quantity_damaged, p_quantity_missing,
    p_notes, p_received_by
  );
end;
$$;

create function public.reject_request_transaction(p_request_id uuid, p_rejection_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);
  perform public.reject_request_transaction_security_impl_20260910(p_request_id, p_rejection_reason);
end;
$$;

create function public.update_item_unit_status_transaction(
  p_unit_id uuid, p_condition text, p_notes text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);
  perform public.update_item_unit_status_transaction_security_impl_20260910(
    p_unit_id, p_condition, p_notes
  );
end;
$$;

-- Las implementaciones internas ya no son superficie RPC para clientes.
revoke all on function public.approve_request_transaction_security_impl_20260910(uuid, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.create_inventory_item_transaction_security_impl_20260910(text, text, text, text, text, boolean, integer, integer, text, text, text[]) from public, anon, authenticated, service_role;
revoke all on function public.create_multi_item_loan_transaction_security_impl_20260910(uuid, jsonb, date, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.create_request_transaction_security_impl_20260910(text, text, date, jsonb, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.deliver_approved_request_with_units_security_impl_20260910(uuid, jsonb, jsonb, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.register_full_return_transaction_security_impl_20260910(uuid, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.register_maintenance_record_transaction_security_impl_20260910(uuid, uuid, text, text, date, text, text, boolean) from public, anon, authenticated, service_role;
revoke all on function public.register_return_transaction_security_impl_20260910(uuid, integer, integer, integer, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.reject_request_transaction_security_impl_20260910(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.update_item_unit_status_transaction_security_impl_20260910(uuid, text, text) from public, anon, authenticated, service_role;

-- Solo authenticated usa las RPC públicas. La aplicación no utiliza service_role.
revoke all on function public.approve_request_transaction(uuid, jsonb) from public, anon, service_role;
grant execute on function public.approve_request_transaction(uuid, jsonb) to authenticated;
revoke all on function public.create_inventory_item_transaction(text, text, text, text, text, boolean, integer, integer, text, text, text[]) from public, anon, service_role;
grant execute on function public.create_inventory_item_transaction(text, text, text, text, text, boolean, integer, integer, text, text, text[]) to authenticated;
revoke all on function public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid) from public, anon, service_role;
grant execute on function public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid) to authenticated;
revoke all on function public.create_request_transaction(text, text, date, jsonb, jsonb) from public, anon, service_role;
grant execute on function public.create_request_transaction(text, text, date, jsonb, jsonb) to authenticated;
revoke all on function public.deliver_approved_request_with_units(uuid, jsonb, jsonb, uuid, text) from public, anon, service_role;
grant execute on function public.deliver_approved_request_with_units(uuid, jsonb, jsonb, uuid, text) to authenticated;
revoke all on function public.register_full_return_transaction(uuid, text, uuid) from public, anon, service_role;
grant execute on function public.register_full_return_transaction(uuid, text, uuid) to authenticated;
revoke all on function public.register_maintenance_record_transaction(uuid, uuid, text, text, date, text, text, boolean) from public, anon, service_role;
grant execute on function public.register_maintenance_record_transaction(uuid, uuid, text, text, date, text, text, boolean) to authenticated;
revoke all on function public.register_return_transaction(uuid, integer, integer, integer, text, uuid) from public, anon, service_role;
grant execute on function public.register_return_transaction(uuid, integer, integer, integer, text, uuid) to authenticated;
revoke all on function public.reject_request_transaction(uuid, text) from public, anon, service_role;
grant execute on function public.reject_request_transaction(uuid, text) to authenticated;
revoke all on function public.update_item_unit_status_transaction(uuid, text, text) from public, anon, service_role;
grant execute on function public.update_item_unit_status_transaction(uuid, text, text) to authenticated;

-- Funciones heredadas: se conservan para trazabilidad, sin ejecución cliente.
revoke all on function public.create_loan_transaction(uuid, uuid, integer, date, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.create_loan_with_unit_transaction(uuid, uuid, uuid, integer, date, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.deliver_approved_request(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.deliver_approved_request_with_units(uuid, jsonb, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.increment_stock(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

commit;
