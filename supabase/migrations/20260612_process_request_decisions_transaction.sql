-- Aprueba o rechaza solicitudes con validación y escrituras atómicas.
-- El stock se valida al aprobar, pero solo se descuenta al entregar.

create or replace function public.approve_request_transaction(
  p_request_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_request_status text;
  v_has_groups boolean;
  v_item_payload jsonb;
  v_request_item_id uuid;
  v_item_id uuid;
  v_quantity_requested integer;
  v_quantity_approved integer;
  v_has_approved_item boolean := false;
  v_seen_request_item_ids uuid[] := array[]::uuid[];
  v_totals jsonb := '{}'::jsonb;
  v_total_entry record;
  v_item_status text;
  v_stock_available integer;
  v_request_item_count integer;
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  select role::text into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is null or v_role not in ('admin', 'lab_staff') then
    raise exception 'No tiene permisos para aprobar solicitudes.';
  end if;

  if p_request_id is null then
    raise exception 'Solicitud inválida.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Las cantidades aprobadas no son válidas.';
  end if;

  select status::text into v_request_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'No se encontró la solicitud.';
  end if;

  if v_request_status <> 'pending' then
    raise exception 'Solo se pueden aprobar solicitudes pendientes.';
  end if;

  select exists (
    select 1 from public.request_groups where request_id = p_request_id
  ) into v_has_groups;

  if v_has_groups then
    if jsonb_array_length(p_items) <> 0 then
      raise exception 'Una solicitud grupal no admite cantidades individuales.';
    end if;

    for v_total_entry in
      select rgi.item_id::text as key, sum(rgi.quantity)::text as value
      from public.request_groups rg
      join public.request_group_items rgi on rgi.request_group_id = rg.id
      where rg.request_id = p_request_id
      group by rgi.item_id
    loop
      v_item_id := v_total_entry.key::uuid;
      v_quantity_approved := v_total_entry.value::integer;
      v_has_approved_item := true;

      select status::text, stock_available
        into v_item_status, v_stock_available
      from public.items
      where id = v_item_id
      for share;

      if not found or v_item_status <> 'active' then
        raise exception 'Uno de los materiales grupales ya no está disponible.';
      end if;

      if v_quantity_approved > v_stock_available then
        raise exception 'La cantidad total de los grupos excede el stock disponible.';
      end if;
    end loop;

    if not v_has_approved_item then
      raise exception 'La solicitud grupal no contiene materiales válidos.';
    end if;
  else
    select count(*) into v_request_item_count
    from public.request_items
    where request_id = p_request_id;

    if v_request_item_count = 0
      or jsonb_array_length(p_items) <> v_request_item_count then
      raise exception 'Los ítems enviados no coinciden con la solicitud.';
    end if;

    for v_item_payload in select value from jsonb_array_elements(p_items)
    loop
      begin
        v_request_item_id := (v_item_payload->>'request_item_id')::uuid;
        v_quantity_approved := (v_item_payload->>'quantity_approved')::integer;
      exception
        when invalid_text_representation then
          raise exception 'Una de las cantidades aprobadas no es válida.';
      end;

      if v_request_item_id is null
        or v_quantity_approved is null
        or v_quantity_approved < 0 then
        raise exception 'Una de las cantidades aprobadas no es válida.';
      end if;

      if v_request_item_id = any(v_seen_request_item_ids) then
        raise exception 'No se puede repetir un ítem de la solicitud.';
      end if;

      v_seen_request_item_ids := array_append(
        v_seen_request_item_ids,
        v_request_item_id
      );

      select item_id, quantity_requested
        into v_item_id, v_quantity_requested
      from public.request_items
      where id = v_request_item_id
        and request_id = p_request_id
      for update;

      if not found then
        raise exception 'Uno de los ítems no pertenece a la solicitud.';
      end if;

      if v_quantity_approved > v_quantity_requested then
        raise exception 'La cantidad aprobada no puede exceder la solicitada.';
      end if;

      if v_quantity_approved > 0 then
        v_has_approved_item := true;
      end if;

      v_totals := jsonb_set(
        v_totals,
        array[v_item_id::text],
        to_jsonb(
          coalesce((v_totals->>v_item_id::text)::integer, 0)
          + v_quantity_approved
        ),
        true
      );
    end loop;

    if not v_has_approved_item then
      raise exception 'Debe aprobar al menos una cantidad mayor a cero.';
    end if;

    for v_total_entry in select key, value from jsonb_each_text(v_totals)
    loop
      v_item_id := v_total_entry.key::uuid;
      v_quantity_approved := v_total_entry.value::integer;

      select status::text, stock_available
        into v_item_status, v_stock_available
      from public.items
      where id = v_item_id
      for share;

      if not found or v_item_status <> 'active' then
        raise exception 'Uno de los ítems ya no está disponible.';
      end if;

      if v_quantity_approved > v_stock_available then
        raise exception 'La cantidad aprobada excede el stock disponible.';
      end if;
    end loop;

    for v_item_payload in select value from jsonb_array_elements(p_items)
    loop
      update public.request_items
      set quantity_approved = (v_item_payload->>'quantity_approved')::integer
      where id = (v_item_payload->>'request_item_id')::uuid
        and request_id = p_request_id;
    end loop;
  end if;

  update public.requests
  set
    status = 'approved',
    approved_by = v_user_id,
    approved_at = now(),
    rejection_reason = null
  where id = p_request_id;
end;
$$;

create or replace function public.reject_request_transaction(
  p_request_id uuid,
  p_rejection_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_request_status text;
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  select role::text into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is null or v_role not in ('admin', 'lab_staff') then
    raise exception 'No tiene permisos para rechazar solicitudes.';
  end if;

  if p_request_id is null then
    raise exception 'Solicitud inválida.';
  end if;

  select status::text into v_request_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'No se encontró la solicitud.';
  end if;

  if v_request_status <> 'pending' then
    raise exception 'Solo se pueden rechazar solicitudes pendientes.';
  end if;

  update public.requests
  set
    status = 'rejected',
    approved_by = v_user_id,
    approved_at = now(),
    rejection_reason = coalesce(
      nullif(btrim(p_rejection_reason), ''),
      'Solicitud rechazada'
    )
  where id = p_request_id;
end;
$$;

revoke all on function public.approve_request_transaction(uuid, jsonb)
from public;
revoke all on function public.reject_request_transaction(uuid, text)
from public;

grant execute on function public.approve_request_transaction(uuid, jsonb)
to authenticated;
grant execute on function public.reject_request_transaction(uuid, text)
to authenticated;
