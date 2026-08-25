-- Entrega solicitudes aprobadas asignando unidades patrimoniales concretas.
-- Conserva solicitudes individuales, grupales y materiales sin seguimiento individual.

create or replace function public.deliver_approved_request_with_units(
  p_request_id uuid,
  p_units jsonb,
  p_delivered_by uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_role text;
  v_request record;
  v_loan_id uuid;
  v_has_groups boolean;
  v_totals jsonb := '{}'::jsonb;
  v_total_entry record;
  v_item_id uuid;
  v_quantity integer;
  v_status text;
  v_stock integer;
  v_track_individual boolean;
  v_unit_count integer;
  v_group record;
  v_group_item record;
  v_loan_group_id uuid;
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
    raise exception 'No tiene permisos para entregar solicitudes.';
  end if;

  if p_units is null then
    p_units := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_units) <> 'array' then
    raise exception 'Las unidades seleccionadas no son válidas.';
  end if;

  select * into v_request
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada.';
  end if;

  if v_request.status::text <> 'approved' then
    raise exception 'Solo se pueden entregar solicitudes aprobadas.';
  end if;

  select exists (
    select 1 from public.request_groups where request_id = p_request_id
  ) into v_has_groups;

  if v_has_groups then
    for v_total_entry in
      select rgi.item_id::text as key, sum(rgi.quantity)::text as value
      from public.request_groups rg
      join public.request_group_items rgi on rgi.request_group_id = rg.id
      where rg.request_id = p_request_id
      group by rgi.item_id
    loop
      v_totals := jsonb_set(
        v_totals,
        array[v_total_entry.key],
        to_jsonb(v_total_entry.value::integer),
        true
      );
    end loop;
  else
    for v_total_entry in
      select ri.item_id::text as key, sum(ri.quantity_approved)::text as value
      from public.request_items ri
      where ri.request_id = p_request_id
        and ri.quantity_approved > 0
      group by ri.item_id
    loop
      v_totals := jsonb_set(
        v_totals,
        array[v_total_entry.key],
        to_jsonb(v_total_entry.value::integer),
        true
      );
    end loop;
  end if;

  if v_totals = '{}'::jsonb then
    raise exception 'No existen materiales válidos para entregar.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_units) as x(item_id uuid, item_unit_id uuid)
    where item_id is null or item_unit_id is null
  ) then
    raise exception 'Una unidad patrimonial seleccionada no es válida.';
  end if;

  if exists (
    select item_unit_id
    from jsonb_to_recordset(p_units) as x(item_id uuid, item_unit_id uuid)
    group by item_unit_id
    having count(*) > 1
  ) then
    raise exception 'Una unidad patrimonial no puede repetirse.';
  end if;

  -- Bloquea los ítems en orden estable y valida cantidades agregadas.
  for v_total_entry in
    select key, value from jsonb_each_text(v_totals) order by key
  loop
    v_item_id := v_total_entry.key::uuid;
    v_quantity := v_total_entry.value::integer;

    select status::text, stock_available, track_individual
      into v_status, v_stock, v_track_individual
    from public.items
    where id = v_item_id
    for update;

    if not found or v_status <> 'active' then
      raise exception 'Uno de los materiales no existe o no está activo.';
    end if;

    if v_quantity <= 0 or v_quantity > v_stock then
      raise exception 'Stock insuficiente para uno de los materiales.';
    end if;

    select count(*) into v_unit_count
    from jsonb_to_recordset(p_units) as x(item_id uuid, item_unit_id uuid)
    where x.item_id = v_item_id;

    if v_track_individual and v_unit_count <> v_quantity then
      raise exception 'Debe seleccionar exactamente una unidad patrimonial por equipo aprobado.';
    end if;

    if not v_track_individual and v_unit_count <> 0 then
      raise exception 'Un material sin seguimiento individual no admite unidades patrimoniales.';
    end if;
  end loop;

  -- Rechaza unidades asociadas a ítems que no forman parte de la entrega.
  if exists (
    select 1
    from jsonb_to_recordset(p_units) as x(item_id uuid, item_unit_id uuid)
    where not (v_totals ? x.item_id::text)
  ) then
    raise exception 'Una unidad seleccionada no pertenece a la solicitud.';
  end if;

  -- Bloquea y valida las unidades en orden estable.
  perform 1
  from public.item_units u
  join jsonb_to_recordset(p_units) as x(item_id uuid, item_unit_id uuid)
    on x.item_unit_id = u.id
  order by u.id
  for update of u;

  if exists (
    select 1
    from jsonb_to_recordset(p_units) as x(item_id uuid, item_unit_id uuid)
    left join public.item_units u on u.id = x.item_unit_id
    where u.id is null
       or u.item_id <> x.item_id
       or u.availability_status::text <> 'available'
       or u.condition::text <> 'good'
  ) then
    raise exception 'Una unidad patrimonial no existe o ya no está disponible.';
  end if;

  insert into public.loans (
    request_id,
    user_id,
    delivered_by,
    delivery_date,
    expected_return_date,
    status,
    notes
  ) values (
    v_request.id,
    v_request.user_id,
    v_auth_user_id,
    now(),
    v_request.scheduled_return_date,
    'active',
    nullif(btrim(p_notes), '')
  ) returning id into v_loan_id;

  for v_total_entry in
    select key, value from jsonb_each_text(v_totals) order by key
  loop
    v_item_id := v_total_entry.key::uuid;
    v_quantity := v_total_entry.value::integer;

    select track_individual into v_track_individual
    from public.items
    where id = v_item_id;

    if v_track_individual then
      insert into public.loan_items (
        loan_id, item_id, item_unit_id, quantity,
        returned_quantity, damaged_quantity, missing_quantity
      )
      select
        v_loan_id, v_item_id, x.item_unit_id, 1, 0, 0, 0
      from jsonb_to_recordset(p_units) as x(item_id uuid, item_unit_id uuid)
      where x.item_id = v_item_id;

      update public.item_units u
      set availability_status = 'loaned',
          updated_at = now()
      from jsonb_to_recordset(p_units) as x(item_id uuid, item_unit_id uuid)
      where x.item_id = v_item_id
        and u.id = x.item_unit_id;
    else
      insert into public.loan_items (
        loan_id, item_id, item_unit_id, quantity,
        returned_quantity, damaged_quantity, missing_quantity
      ) values (
        v_loan_id, v_item_id, null, v_quantity, 0, 0, 0
      );
    end if;

    update public.items
    set stock_available = stock_available - v_quantity,
        updated_at = now()
    where id = v_item_id;

    insert into public.inventory_movements (
      item_id, movement_type, quantity, reference_table,
      reference_id, notes, created_by
    ) values (
      v_item_id,
      'loan_out',
      v_quantity,
      'loans',
      v_loan_id,
      coalesce(nullif(btrim(p_notes), ''), 'Entrega desde solicitud aprobada'),
      v_auth_user_id
    );
  end loop;

  if v_has_groups then
    for v_group in
      select id, group_name, leader_student_id
      from public.request_groups
      where request_id = p_request_id
      order by created_at asc
    loop
      insert into public.loan_groups (
        loan_id, request_group_id, group_name, leader_student_id
      ) values (
        v_loan_id, v_group.id, v_group.group_name, v_group.leader_student_id
      ) returning id into v_loan_group_id;

      for v_group_item in
        select item_id, quantity
        from public.request_group_items
        where request_group_id = v_group.id
      loop
        insert into public.loan_group_items (
          loan_group_id, item_id, quantity
        ) values (
          v_loan_group_id, v_group_item.item_id, v_group_item.quantity
        );
      end loop;
    end loop;
  else
    update public.request_items
    set quantity_delivered = quantity_approved
    where request_id = p_request_id;
  end if;

  update public.requests
  set status = 'delivered',
      updated_at = now()
  where id = p_request_id;

  return v_loan_id;
end;
$$;

revoke all on function public.deliver_approved_request_with_units(
  uuid, jsonb, uuid, text
) from public;

grant execute on function public.deliver_approved_request_with_units(
  uuid, jsonb, uuid, text
) to authenticated;
