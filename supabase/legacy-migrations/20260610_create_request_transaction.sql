-- Crea solicitudes individuales o grupales en una única transacción.
-- La función valida rol, estudiantes, materiales y stock antes de insertar datos.

create or replace function public.create_request_transaction(
  p_purpose text,
  p_comments text,
  p_scheduled_return_date date,
  p_items jsonb,
  p_groups jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_request_id uuid;
  v_group_id uuid;
  v_group jsonb;
  v_group_item jsonb;
  v_item jsonb;
  v_group_name text;
  v_leader_id uuid;
  v_item_id uuid;
  v_quantity integer;
  v_item_status text;
  v_stock_available integer;
  v_totals jsonb := '{}'::jsonb;
  v_total_entry record;
  v_leader_ids uuid[] := array[]::uuid[];
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  select role::text
    into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is null or v_role not in ('teacher', 'student') then
    raise exception 'Su rol no permite crear solicitudes.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'La lista de materiales individuales no es válida.';
  end if;

  if p_groups is null or jsonb_typeof(p_groups) <> 'array' then
    raise exception 'La lista de grupos no es válida.';
  end if;

  if jsonb_array_length(p_groups) > 0 then
    if v_role <> 'teacher' then
      raise exception 'Su rol no permite crear solicitudes grupales.';
    end if;

    if jsonb_array_length(p_items) > 0 then
      raise exception 'Una solicitud grupal no puede incluir materiales individuales separados.';
    end if;

    for v_group in select value from jsonb_array_elements(p_groups)
    loop
      if jsonb_typeof(v_group) <> 'object' then
        raise exception 'Uno de los grupos no es válido.';
      end if;

      v_group_name := btrim(coalesce(v_group->>'group_name', ''));

      if v_group_name = '' then
        raise exception 'Todos los grupos deben tener nombre.';
      end if;

      begin
        v_leader_id := (v_group->>'leader_student_id')::uuid;
      exception
        when invalid_text_representation then
          raise exception 'Uno de los jefes de grupo no es válido.';
      end;

      if v_leader_id = any(v_leader_ids) then
        raise exception 'No se puede repetir el jefe de grupo.';
      end if;

      v_leader_ids := array_append(v_leader_ids, v_leader_id);

      if not exists (
        select 1
        from public.profiles
        where id = v_leader_id
          and role::text = 'student'
      ) then
        raise exception 'Todos los jefes de grupo deben ser estudiantes válidos.';
      end if;

      if jsonb_typeof(v_group->'items') <> 'array'
        or jsonb_array_length(v_group->'items') = 0 then
        raise exception 'Cada grupo debe incluir al menos un material.';
      end if;

      for v_group_item in
        select value from jsonb_array_elements(v_group->'items')
      loop
        begin
          v_item_id := (v_group_item->>'item_id')::uuid;
          v_quantity := (v_group_item->>'quantity')::integer;
        exception
          when invalid_text_representation then
            raise exception 'Uno de los materiales grupales no es válido.';
        end;

        if v_quantity < 1 then
          raise exception 'Las cantidades grupales deben ser mayores a cero.';
        end if;

        v_totals := jsonb_set(
          v_totals,
          array[v_item_id::text],
          to_jsonb(coalesce((v_totals->>v_item_id::text)::integer, 0) + v_quantity),
          true
        );
      end loop;
    end loop;
  else
    if jsonb_array_length(p_items) = 0 then
      raise exception 'Debe agregar al menos un material válido a la solicitud.';
    end if;

    for v_item in select value from jsonb_array_elements(p_items)
    loop
      begin
        v_item_id := (v_item->>'item_id')::uuid;
        v_quantity := (v_item->>'quantity_requested')::integer;
      exception
        when invalid_text_representation then
          raise exception 'Uno de los materiales seleccionados no es válido.';
      end;

      if v_quantity < 1 then
        raise exception 'Las cantidades deben ser mayores a cero.';
      end if;

      v_totals := jsonb_set(
        v_totals,
        array[v_item_id::text],
        to_jsonb(coalesce((v_totals->>v_item_id::text)::integer, 0) + v_quantity),
        true
      );
    end loop;
  end if;

  for v_total_entry in select key, value from jsonb_each_text(v_totals)
  loop
    v_item_id := v_total_entry.key::uuid;
    v_quantity := v_total_entry.value::integer;

    select status::text, stock_available
      into v_item_status, v_stock_available
    from public.items
    where id = v_item_id
    for share;

    if not found then
      raise exception 'Uno de los materiales seleccionados no existe.';
    end if;

    if v_item_status <> 'active' then
      raise exception 'Uno de los materiales seleccionados no está disponible.';
    end if;

    if v_quantity > v_stock_available then
      raise exception 'La cantidad solicitada excede el stock disponible.';
    end if;
  end loop;

  insert into public.requests (
    user_id,
    purpose,
    comments,
    scheduled_return_date,
    status
  ) values (
    v_user_id,
    nullif(btrim(p_purpose), ''),
    nullif(btrim(p_comments), ''),
    p_scheduled_return_date,
    'pending'
  )
  returning id into v_request_id;

  for v_total_entry in select key, value from jsonb_each_text(v_totals)
  loop
    insert into public.request_items (
      request_id,
      item_id,
      quantity_requested,
      quantity_approved,
      quantity_delivered,
      quantity_returned,
      quantity_damaged
    ) values (
      v_request_id,
      v_total_entry.key::uuid,
      v_total_entry.value::integer,
      0,
      0,
      0,
      0
    );
  end loop;

  if jsonb_array_length(p_groups) > 0 then
    for v_group in select value from jsonb_array_elements(p_groups)
    loop
      v_group_name := btrim(v_group->>'group_name');
      v_leader_id := (v_group->>'leader_student_id')::uuid;

      insert into public.request_groups (
        request_id,
        group_name,
        leader_student_id
      ) values (
        v_request_id,
        v_group_name,
        v_leader_id
      )
      returning id into v_group_id;

      for v_group_item in
        select value from jsonb_array_elements(v_group->'items')
      loop
        insert into public.request_group_items (
          request_group_id,
          item_id,
          quantity
        ) values (
          v_group_id,
          (v_group_item->>'item_id')::uuid,
          (v_group_item->>'quantity')::integer
        );
      end loop;
    end loop;
  end if;

  return v_request_id;
end;
$$;

revoke all on function public.create_request_transaction(
  text,
  text,
  date,
  jsonb,
  jsonb
) from public;

grant execute on function public.create_request_transaction(
  text,
  text,
  date,
  jsonb,
  jsonb
) to authenticated;
