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

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and role::text in ('teacher', 'student')
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
