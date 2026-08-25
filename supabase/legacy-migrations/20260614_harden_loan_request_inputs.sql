-- Refuerza préstamos y solicitudes contra llamadas directas fuera de la UI.
-- No modifica tablas ni datos existentes.

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

  if p_scheduled_return_date is not null
    and p_scheduled_return_date < (now() at time zone 'America/Guayaquil')::date then
    raise exception 'La fecha estimada de devolución no puede estar en el pasado.';
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
          and is_active = true
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


-- Crea un préstamo con varios materiales dentro de una única transacción.
-- Requiere los valores loaned/unavailable añadidos a unit_availability.

create or replace function public.create_multi_item_loan_transaction(
  p_user_id uuid,
  p_items jsonb,
  p_expected_return_date date,
  p_notes text,
  p_delivered_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_role text;
  v_loan_id uuid;
  v_row record;
begin
  if v_auth_user_id is null then
    raise exception 'No autenticado.';
  end if;

  if p_delivered_by is distinct from v_auth_user_id then
    raise exception 'El responsable de entrega debe ser el usuario autenticado.';
  end if;

  select role::text into v_role
  from public.profiles
  where id = v_auth_user_id;

  if v_role is null or v_role not in ('admin', 'lab_staff') then
    raise exception 'No tiene permisos para registrar préstamos.';
  end if;

  if p_expected_return_date is not null
    and p_expected_return_date < (now() at time zone 'America/Guayaquil')::date then
    raise exception 'La fecha esperada de devolución no puede estar en el pasado.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id
      and role::text in ('teacher', 'student')
      and is_active = true
  ) then
    raise exception 'El prestatario no es válido.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Debe incluir al menos un material.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(
      item_id uuid,
      item_unit_id uuid,
      quantity integer
    )
    where item_id is null or quantity is null or quantity <= 0
  ) then
    raise exception 'La lista contiene materiales o cantidades inválidas.';
  end if;

  if exists (
    select item_unit_id
    from jsonb_to_recordset(p_items) as x(
      item_id uuid,
      item_unit_id uuid,
      quantity integer
    )
    where item_unit_id is not null
    group by item_unit_id
    having count(*) > 1
  ) then
    raise exception 'Una unidad patrimonial no puede repetirse en el préstamo.';
  end if;

  -- Bloqueo estable de todos los ítems para evitar carreras de stock.
  perform 1
  from public.items i
  join (
    select distinct item_id
    from jsonb_to_recordset(p_items) as x(
      item_id uuid,
      item_unit_id uuid,
      quantity integer
    )
  ) requested on requested.item_id = i.id
  order by i.id
  for update of i;

  for v_row in
    select
      i.id as item_id,
      i.status::text as status,
      i.track_individual,
      i.stock_available,
      sum(x.quantity)::integer as requested_quantity,
      count(*) filter (where x.item_unit_id is not null)::integer as unit_count
    from jsonb_to_recordset(p_items) as x(
      item_id uuid,
      item_unit_id uuid,
      quantity integer
    )
    left join public.items i on i.id = x.item_id
    group by i.id, i.status, i.track_individual, i.stock_available
  loop
    if v_row.item_id is null or v_row.status <> 'active' then
      raise exception 'Uno de los materiales no existe o no está activo.';
    end if;

    if v_row.requested_quantity > v_row.stock_available then
      raise exception 'Stock insuficiente para uno de los materiales.';
    end if;

    if v_row.track_individual
       and v_row.unit_count <> v_row.requested_quantity then
      raise exception 'Cada equipo individual debe incluir su unidad patrimonial.';
    end if;

    if not v_row.track_individual and v_row.unit_count <> 0 then
      raise exception 'Un material sin seguimiento no admite unidad patrimonial.';
    end if;
  end loop;

  -- Bloquea y valida todas las unidades individuales solicitadas.
  perform 1
  from public.item_units u
  join (
    select item_id, item_unit_id
    from jsonb_to_recordset(p_items) as x(
      item_id uuid,
      item_unit_id uuid,
      quantity integer
    )
    where item_unit_id is not null
  ) requested on requested.item_unit_id = u.id
  order by u.id
  for update of u;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(
      item_id uuid,
      item_unit_id uuid,
      quantity integer
    )
    left join public.item_units u on u.id = x.item_unit_id
    where x.item_unit_id is not null
      and (
        x.quantity <> 1
        or u.id is null
        or u.item_id <> x.item_id
        or u.availability_status::text <> 'available'
        or u.condition::text <> 'good'
      )
  ) then
    raise exception 'Una unidad patrimonial no existe o ya no está disponible.';
  end if;

  insert into public.loans (
    user_id, delivered_by, expected_return_date, status, notes
  ) values (
    p_user_id,
    v_auth_user_id,
    p_expected_return_date,
    'active',
    nullif(btrim(p_notes), '')
  ) returning id into v_loan_id;

  -- Materiales por cantidad se consolidan en un solo detalle por ítem.
  insert into public.loan_items (
    loan_id, item_id, item_unit_id, quantity,
    returned_quantity, damaged_quantity, missing_quantity
  )
  select
    v_loan_id,
    x.item_id,
    null,
    sum(x.quantity)::integer,
    0,
    0,
    0
  from jsonb_to_recordset(p_items) as x(
    item_id uuid,
    item_unit_id uuid,
    quantity integer
  )
  join public.items i on i.id = x.item_id
  where not i.track_individual
  group by x.item_id;

  -- Cada unidad patrimonial conserva un detalle separado de cantidad 1.
  insert into public.loan_items (
    loan_id, item_id, item_unit_id, quantity,
    returned_quantity, damaged_quantity, missing_quantity
  )
  select
    v_loan_id,
    x.item_id,
    x.item_unit_id,
    1,
    0,
    0,
    0
  from jsonb_to_recordset(p_items) as x(
    item_id uuid,
    item_unit_id uuid,
    quantity integer
  )
  join public.items i on i.id = x.item_id
  where i.track_individual;

  for v_row in
    select x.item_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(
      item_id uuid,
      item_unit_id uuid,
      quantity integer
    )
    group by x.item_id
  loop
    update public.items
    set stock_available = stock_available - v_row.quantity,
        updated_at = now()
    where id = v_row.item_id;

    insert into public.inventory_movements (
      item_id, movement_type, quantity, reference_table,
      reference_id, notes, created_by
    ) values (
      v_row.item_id,
      'loan_out',
      v_row.quantity,
      'loans',
      v_loan_id,
      nullif(btrim(p_notes), ''),
      v_auth_user_id
    );
  end loop;

  update public.item_units u
  set availability_status = 'loaned',
      updated_at = now()
  from jsonb_to_recordset(p_items) as x(
    item_id uuid,
    item_unit_id uuid,
    quantity integer
  )
  where x.item_unit_id is not null
    and u.id = x.item_unit_id;

  return v_loan_id;
end;
$$;

revoke all on function public.create_multi_item_loan_transaction(
  uuid, jsonb, date, text, uuid
) from public;

grant execute on function public.create_multi_item_loan_transaction(
  uuid, jsonb, date, text, uuid
) to authenticated;
