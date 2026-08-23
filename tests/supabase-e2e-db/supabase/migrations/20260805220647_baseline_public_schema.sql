


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."item_status" AS ENUM (
    'active',
    'inactive',
    'maintenance'
);


ALTER TYPE "public"."item_status" OWNER TO "postgres";


CREATE TYPE "public"."item_type" AS ENUM (
    'consumable',
    'equipment'
);


ALTER TYPE "public"."item_type" OWNER TO "postgres";


CREATE TYPE "public"."loan_status" AS ENUM (
    'active',
    'returned',
    'partial_return',
    'overdue',
    'cancelled'
);


ALTER TYPE "public"."loan_status" OWNER TO "postgres";


CREATE TYPE "public"."request_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'delivered',
    'returned',
    'partial_return'
);


ALTER TYPE "public"."request_status" OWNER TO "postgres";


CREATE TYPE "public"."unit_availability" AS ENUM (
    'available',
    'borrowed',
    'reserved',
    'maintenance',
    'lost',
    'loaned',
    'unavailable'
);


ALTER TYPE "public"."unit_availability" OWNER TO "postgres";


CREATE TYPE "public"."unit_condition" AS ENUM (
    'good',
    'damaged',
    'maintenance',
    'lost',
    'retired'
);


ALTER TYPE "public"."unit_condition" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'lab_staff',
    'teacher',
    'student'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_request_transaction"("p_request_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."approve_request_transaction"("p_request_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_own_request_transaction"("p_request_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_request_user_id uuid;
  v_request_status text;
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  if p_request_id is null then
    raise exception 'Solicitud inválida.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role::text in ('teacher', 'student')
      and is_active = true
  ) then
    raise exception 'Su perfil no puede cancelar solicitudes.';
  end if;

  select user_id, status::text
    into v_request_user_id, v_request_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'La solicitud no existe.';
  end if;

  if v_request_user_id is distinct from v_user_id then
    raise exception 'No puede cancelar una solicitud de otro usuario.';
  end if;

  if v_request_status <> 'pending' then
    raise exception 'Solo se pueden cancelar solicitudes pendientes.';
  end if;

  update public.requests
  set status = 'cancelled',
      updated_at = now()
  where id = p_request_id;

  return p_request_id;
end;
$$;


ALTER FUNCTION "public"."cancel_own_request_transaction"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_inventory_item_transaction"("p_code" "text", "p_name" "text", "p_description" "text", "p_category" "text", "p_item_type" "text", "p_track_individual" boolean, "p_stock_total" integer, "p_stock_available" integer, "p_status" "text", "p_location" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_item_id uuid;
  v_item_type public.items.item_type%type;
  v_status public.items.status%type;
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  select role::text into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is null or v_role not in ('admin', 'lab_staff') then
    raise exception 'No tiene permisos para gestionar inventario.';
  end if;

  if nullif(btrim(p_code), '') is null
    or nullif(btrim(p_name), '') is null then
    raise exception 'Faltan campos obligatorios.';
  end if;

  if p_item_type not in ('consumable', 'equipment') then
    raise exception 'El tipo de ítem no es válido.';
  end if;

  if p_status not in ('active', 'inactive', 'maintenance') then
    raise exception 'El estado del ítem no es válido.';
  end if;

  if p_stock_total is null or p_stock_total < 0
    or p_stock_available is null or p_stock_available < 0 then
    raise exception 'Los valores de stock deben ser enteros no negativos.';
  end if;

  if p_stock_available > p_stock_total then
    raise exception 'El stock disponible no puede superar el stock total.';
  end if;

  if p_track_individual and p_item_type <> 'equipment' then
    raise exception 'El seguimiento individual solo está disponible para equipos.';
  end if;

  if p_track_individual and p_stock_available <> p_stock_total then
    raise exception 'Los equipos con seguimiento individual deben iniciar con todo el stock disponible.';
  end if;

  if p_track_individual and p_stock_total > 1000 then
    raise exception 'No se pueden generar más de 1000 unidades individuales por ítem.';
  end if;

  begin
    v_item_type := p_item_type;
    v_status := p_status;
  exception
    when others then
      raise exception 'El tipo o estado del ítem no es compatible con el inventario.';
  end;

  insert into public.items (
    code,
    name,
    description,
    category,
    item_type,
    track_individual,
    stock_total,
    stock_available,
    status,
    location,
    created_by
  ) values (
    btrim(p_code),
    btrim(p_name),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_category), ''),
    v_item_type,
    p_track_individual,
    p_stock_total,
    p_stock_available,
    v_status,
    nullif(btrim(p_location), ''),
    v_user_id
  )
  returning id into v_item_id;

  if p_track_individual then
    insert into public.item_units (
      item_id,
      serial_code,
      qr_code,
      condition,
      availability_status,
      notes
    )
    select
      v_item_id,
      btrim(p_code) || '-' || lpad(unit_number::text, 3, '0'),
      btrim(p_code) || '-' || lpad(unit_number::text, 3, '0'),
      'good',
      'available',
      null
    from generate_series(1, p_stock_total) as unit_number;
  end if;

  return v_item_id;
end;
$$;


ALTER FUNCTION "public"."create_inventory_item_transaction"("p_code" "text", "p_name" "text", "p_description" "text", "p_category" "text", "p_item_type" "text", "p_track_individual" boolean, "p_stock_total" integer, "p_stock_available" integer, "p_status" "text", "p_location" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_loan_transaction"("p_user_id" "uuid", "p_item_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_stock int;
  v_loan_id uuid;
begin
  select stock_available into v_stock
  from items
  where id = p_item_id
  for update;

  if v_stock is null then
    raise exception 'Item no encontrado';
  end if;

  if p_quantity <= 0 then
    raise exception 'Cantidad inválida';
  end if;

  if v_stock < p_quantity then
    raise exception 'Stock insuficiente';
  end if;

  insert into loans (
    user_id,
    delivered_by,
    expected_return_date,
    status,
    notes
  )
  values (
    p_user_id,
    p_delivered_by,
    p_expected_return_date,
    'active',
    p_notes
  )
  returning id into v_loan_id;

  insert into loan_items (
    loan_id,
    item_id,
    quantity,
    returned_quantity,
    damaged_quantity,
    missing_quantity
  )
  values (
    v_loan_id,
    p_item_id,
    p_quantity,
    0,
    0,
    0
  );

  update items
  set stock_available = stock_available - p_quantity
  where id = p_item_id;

  insert into inventory_movements (
    item_id,
    movement_type,
    quantity,
    reference_table,
    reference_id,
    notes,
    created_by
  )
  values (
    p_item_id,
    'loan_out',
    p_quantity,
    'loans',
    v_loan_id,
    p_notes,
    p_delivered_by
  );
end;
$$;


ALTER FUNCTION "public"."create_loan_transaction"("p_user_id" "uuid", "p_item_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_loan_with_unit_transaction"("p_user_id" "uuid", "p_item_id" "uuid", "p_item_unit_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_auth_user_id uuid := auth.uid();
  v_role text;
  v_stock integer;
  v_track_individual boolean;
  v_loan_id uuid;
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

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Cantidad inválida.';
  end if;

  select stock_available, track_individual
    into v_stock, v_track_individual
  from public.items
  where id = p_item_id and status::text = 'active'
  for update;

  if not found then
    raise exception 'El ítem no existe o no está activo.';
  end if;

  if v_stock < p_quantity then
    raise exception 'Stock insuficiente.';
  end if;

  if v_track_individual then
    if p_quantity <> 1 or p_item_unit_id is null then
      raise exception 'Debe seleccionar exactamente una unidad patrimonial.';
    end if;

    perform 1
    from public.item_units
    where id = p_item_unit_id
      and item_id = p_item_id
      and availability_status::text = 'available'
      and condition::text = 'good'
    for update;

    if not found then
      raise exception 'La unidad seleccionada no está disponible.';
    end if;
  elsif p_item_unit_id is not null then
    raise exception 'Este material no utiliza seguimiento individual.';
  end if;

  insert into public.loans (
    user_id, delivered_by, expected_return_date, status, notes
  ) values (
    p_user_id, v_auth_user_id, p_expected_return_date, 'active', nullif(btrim(p_notes), '')
  ) returning id into v_loan_id;

  insert into public.loan_items (
    loan_id, item_id, item_unit_id, quantity,
    returned_quantity, damaged_quantity, missing_quantity
  ) values (
    v_loan_id, p_item_id, p_item_unit_id, p_quantity, 0, 0, 0
  );

  update public.items
  set stock_available = stock_available - p_quantity,
      updated_at = now()
  where id = p_item_id;

  if p_item_unit_id is not null then
    update public.item_units
    set availability_status = 'loaned', updated_at = now()
    where id = p_item_unit_id;
  end if;

  insert into public.inventory_movements (
    item_id, movement_type, quantity, reference_table,
    reference_id, notes, created_by
  ) values (
    p_item_id, 'loan_out', p_quantity, 'loans',
    v_loan_id, nullif(btrim(p_notes), ''), v_auth_user_id
  );

  return v_loan_id;
end;
$$;


ALTER FUNCTION "public"."create_loan_with_unit_transaction"("p_user_id" "uuid", "p_item_id" "uuid", "p_item_unit_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_multi_item_loan_transaction"("p_user_id" "uuid", "p_items" "jsonb", "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."create_multi_item_loan_transaction"("p_user_id" "uuid", "p_items" "jsonb", "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_request_transaction"("p_purpose" "text", "p_comments" "text", "p_scheduled_return_date" "date", "p_items" "jsonb", "p_groups" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."create_request_transaction"("p_purpose" "text", "p_comments" "text", "p_scheduled_return_date" "date", "p_items" "jsonb", "p_groups" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deliver_approved_request"("p_request_id" "uuid", "p_delivered_by" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request record;
  v_loan_id uuid;
  v_item record;
  v_group record;
  v_group_item record;
  v_loan_group_id uuid;
  v_has_groups boolean;
  v_items_count integer := 0;
begin
  select *
  into v_request
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitud no encontrada';
  end if;

  if v_request.status <> 'approved' then
    raise exception 'Solo se pueden entregar solicitudes aprobadas';
  end if;

  select exists (
    select 1
    from public.request_groups
    where request_id = p_request_id
  )
  into v_has_groups;

  insert into public.loans (
    request_id,
    user_id,
    delivered_by,
    delivery_date,
    expected_return_date,
    status,
    notes
  )
  values (
    v_request.id,
    v_request.user_id,
    p_delivered_by,
    now(),
    v_request.scheduled_return_date,
    'active',
    p_notes
  )
  returning id into v_loan_id;

  if v_has_groups then
    for v_item in
      select
        rgi.item_id,
        sum(rgi.quantity)::integer as quantity_to_deliver
      from public.request_groups rg
      join public.request_group_items rgi
        on rgi.request_group_id = rg.id
      where rg.request_id = p_request_id
      group by rgi.item_id
    loop
      if v_item.quantity_to_deliver > 0 then
        v_items_count := v_items_count + 1;

        update public.items
        set
          stock_available = stock_available - v_item.quantity_to_deliver,
          updated_at = now()
        where id = v_item.item_id
          and stock_available >= v_item.quantity_to_deliver;

        if not found then
          raise exception 'Stock insuficiente para uno de los ítems solicitados por grupos';
        end if;

        insert into public.loan_items (
          loan_id,
          item_id,
          quantity,
          returned_quantity,
          damaged_quantity
        )
        values (
          v_loan_id,
          v_item.item_id,
          v_item.quantity_to_deliver,
          0,
          0
        );

        insert into public.inventory_movements (
          item_id,
          movement_type,
          quantity,
          reference_table,
          reference_id,
          notes,
          created_by
        )
        values (
          v_item.item_id,
          'loan_out',
          v_item.quantity_to_deliver,
          'loans',
          v_loan_id,
          coalesce(p_notes, 'Entrega desde solicitud por grupos aprobada'),
          p_delivered_by
        );
      end if;
    end loop;

    for v_group in
      select id, group_name, leader_student_id
      from public.request_groups
      where request_id = p_request_id
      order by created_at asc
    loop
      insert into public.loan_groups (
        loan_id,
        request_group_id,
        group_name,
        leader_student_id
      )
      values (
        v_loan_id,
        v_group.id,
        v_group.group_name,
        v_group.leader_student_id
      )
      returning id into v_loan_group_id;

      for v_group_item in
        select item_id, quantity
        from public.request_group_items
        where request_group_id = v_group.id
      loop
        insert into public.loan_group_items (
          loan_group_id,
          item_id,
          quantity
        )
        values (
          v_loan_group_id,
          v_group_item.item_id,
          v_group_item.quantity
        );
      end loop;
    end loop;

  else
    for v_item in
      select
        ri.id as request_item_id,
        ri.item_id,
        ri.quantity_approved as quantity_to_deliver
      from public.request_items ri
      where ri.request_id = p_request_id
    loop
      if v_item.quantity_to_deliver > 0 then
        v_items_count := v_items_count + 1;

        update public.items
        set
          stock_available = stock_available - v_item.quantity_to_deliver,
          updated_at = now()
        where id = v_item.item_id
          and stock_available >= v_item.quantity_to_deliver;

        if not found then
          raise exception 'Stock insuficiente para uno de los ítems aprobados';
        end if;

        insert into public.loan_items (
          loan_id,
          item_id,
          quantity,
          returned_quantity,
          damaged_quantity
        )
        values (
          v_loan_id,
          v_item.item_id,
          v_item.quantity_to_deliver,
          0,
          0
        );

        update public.request_items
        set quantity_delivered = v_item.quantity_to_deliver
        where id = v_item.request_item_id;

        insert into public.inventory_movements (
          item_id,
          movement_type,
          quantity,
          reference_table,
          reference_id,
          notes,
          created_by
        )
        values (
          v_item.item_id,
          'loan_out',
          v_item.quantity_to_deliver,
          'loans',
          v_loan_id,
          coalesce(p_notes, 'Entrega desde solicitud aprobada'),
          p_delivered_by
        );
      end if;
    end loop;
  end if;

  if v_items_count = 0 then
    raise exception 'No existen ítems válidos para entregar en esta solicitud';
  end if;

  update public.requests
  set
    status = 'delivered',
    updated_at = now()
  where id = p_request_id;
end;
$$;


ALTER FUNCTION "public"."deliver_approved_request"("p_request_id" "uuid", "p_delivered_by" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deliver_approved_request_with_units"("p_request_id" "uuid", "p_units" "jsonb", "p_delivered_by" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."deliver_approved_request_with_units"("p_request_id" "uuid", "p_units" "jsonb", "p_delivered_by" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deliver_approved_request_with_units"("p_request_id" "uuid", "p_units" "jsonb", "p_items" "jsonb", "p_delivered_by" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_auth_user_id uuid := auth.uid();
  v_role text;
  v_request record;
  v_request_item record;
  v_loan_id uuid;
  v_has_groups boolean;
  v_totals jsonb := '{}'::jsonb;
  v_total_entry record;
  v_item_payload record;
  v_item_id uuid;
  v_quantity integer;
  v_status text;
  v_stock integer;
  v_track_individual boolean;
  v_unit_count integer;
  v_group record;
  v_group_item record;
  v_loan_group_id uuid;
  v_remaining_for_item integer;
  v_group_delivery_quantity integer;
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

  if p_items is not null and jsonb_typeof(p_items) <> 'array' then
    raise exception 'Las cantidades de entrega no son válidas.';
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

  if p_items is null then
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
        select ri.item_id::text as key,
               sum(ri.quantity_approved - ri.quantity_delivered)::text as value
        from public.request_items ri
        where ri.request_id = p_request_id
          and ri.quantity_approved > ri.quantity_delivered
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
  else
    if exists (
      select 1
      from jsonb_to_recordset(p_items) as x(
        request_item_id uuid,
        item_id uuid,
        quantity integer
      )
      where item_id is null or quantity is null or quantity <= 0
    ) then
      raise exception 'Las cantidades de entrega deben ser mayores a cero.';
    end if;

    if exists (
      select 1
      from jsonb_to_recordset(p_items) as x(
        request_item_id uuid,
        item_id uuid,
        quantity integer
      )
      group by coalesce(request_item_id::text, item_id::text)
      having count(*) > 1
    ) then
      raise exception 'Una cantidad de entrega está duplicada.';
    end if;

    if v_has_groups then
      for v_item_payload in
        select item_id, quantity
        from jsonb_to_recordset(p_items) as x(
          request_item_id uuid,
          item_id uuid,
          quantity integer
        )
        order by item_id
      loop
        select coalesce(sum(rgi.quantity), 0)::integer
          into v_quantity
        from public.request_groups rg
        join public.request_group_items rgi on rgi.request_group_id = rg.id
        where rg.request_id = p_request_id
          and rgi.item_id = v_item_payload.item_id;

        if v_quantity <= 0 then
          raise exception 'Uno de los materiales no pertenece a la solicitud.';
        end if;

        if v_item_payload.quantity > v_quantity then
          raise exception 'La cantidad a entregar supera lo solicitado por grupos.';
        end if;

        v_totals := jsonb_set(
          v_totals,
          array[v_item_payload.item_id::text],
          to_jsonb(v_item_payload.quantity),
          true
        );
      end loop;
    else
      for v_item_payload in
        select request_item_id, item_id, quantity
        from jsonb_to_recordset(p_items) as x(
          request_item_id uuid,
          item_id uuid,
          quantity integer
        )
        order by request_item_id
      loop
        if v_item_payload.request_item_id is null then
          raise exception 'Una cantidad de entrega no corresponde a un ítem aprobado.';
        end if;

        select id, item_id, quantity_approved, quantity_delivered
          into v_request_item
        from public.request_items
        where id = v_item_payload.request_item_id
          and request_id = p_request_id;

        if not found then
          raise exception 'Uno de los ítems aprobados no pertenece a la solicitud.';
        end if;

        if v_request_item.item_id <> v_item_payload.item_id then
          raise exception 'Una cantidad de entrega no coincide con su material.';
        end if;

        v_quantity := v_request_item.quantity_approved - v_request_item.quantity_delivered;

        if v_item_payload.quantity > v_quantity then
          raise exception 'La cantidad a entregar supera lo aprobado pendiente.';
        end if;

        v_totals := jsonb_set(
          v_totals,
          array[v_item_payload.item_id::text],
          to_jsonb(
            coalesce((v_totals ->> (v_item_payload.item_id::text))::integer, 0)
            + v_item_payload.quantity
          ),
          true
        );
      end loop;
    end if;
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
      raise exception 'Debe seleccionar exactamente una unidad patrimonial por equipo a entregar.';
    end if;

    if not v_track_individual and v_unit_count <> 0 then
      raise exception 'Un material sin seguimiento individual no admite unidades patrimoniales.';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_to_recordset(p_units) as x(item_id uuid, item_unit_id uuid)
    where not (v_totals ? x.item_id::text)
  ) then
    raise exception 'Una unidad seleccionada no pertenece a la entrega.';
  end if;

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
      v_loan_group_id := null;

      for v_group_item in
        select item_id, quantity
        from public.request_group_items
        where request_group_id = v_group.id
        order by id
      loop
        v_remaining_for_item := coalesce(
          (v_totals ->> (v_group_item.item_id::text))::integer,
          0
        );
        v_group_delivery_quantity := least(v_group_item.quantity, v_remaining_for_item);

        if v_group_delivery_quantity > 0 then
          if v_loan_group_id is null then
            insert into public.loan_groups (
              loan_id, request_group_id, group_name, leader_student_id
            ) values (
              v_loan_id, v_group.id, v_group.group_name, v_group.leader_student_id
            ) returning id into v_loan_group_id;
          end if;

          insert into public.loan_group_items (
            loan_group_id, item_id, quantity
          ) values (
            v_loan_group_id, v_group_item.item_id, v_group_delivery_quantity
          );

          v_totals := jsonb_set(
            v_totals,
            array[v_group_item.item_id::text],
            to_jsonb(v_remaining_for_item - v_group_delivery_quantity),
            true
          );
        end if;
      end loop;
    end loop;
  else
    if p_items is null then
      update public.request_items
      set quantity_delivered = quantity_approved
      where request_id = p_request_id;
    else
      for v_item_payload in
        select request_item_id, quantity
        from jsonb_to_recordset(p_items) as x(
          request_item_id uuid,
          item_id uuid,
          quantity integer
        )
        order by request_item_id
      loop
        update public.request_items
        set quantity_delivered = quantity_delivered + v_item_payload.quantity
        where id = v_item_payload.request_item_id
          and request_id = p_request_id
          and quantity_delivered + v_item_payload.quantity <= quantity_approved;

        if not found then
          raise exception 'No se pudo actualizar la cantidad entregada de un material.';
        end if;
      end loop;
    end if;
  end if;

  update public.requests
  set status = 'delivered',
      updated_at = now()
  where id = p_request_id;

  return v_loan_id;
end;
$$;


ALTER FUNCTION "public"."deliver_approved_request_with_units"("p_request_id" "uuid", "p_units" "jsonb", "p_items" "jsonb", "p_delivered_by" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_google_institutional_profile"() RETURNS TABLE("profile_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_auth_user_id uuid := auth.uid();
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_full_name text := nullif(
    coalesce(
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() -> 'user_metadata' ->> 'name'
    ),
    ''
  );
  v_profile record;
begin
  if v_auth_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if v_email is null or v_email !~* '^[^[:space:]@]+@ucuenca\.edu\.ec$' then
    raise exception 'Solo se permiten correos institucionales @ucuenca.edu.ec';
  end if;

  select id, role
  into v_profile
  from public.profiles
  where id = v_auth_user_id
  for update;

  if found then
    profile_role := v_profile.role::text;
    return next;
    return;
  end if;

  select id, role
  into v_profile
  from public.profiles
  where lower(email) = v_email
  for update;

  if found then
    if v_profile.id <> v_auth_user_id then
      begin
        update public.profiles
        set
          id = v_auth_user_id,
          updated_at = now()
        where id = v_profile.id;
      exception
        when foreign_key_violation then
          raise exception 'No se pudo enlazar el perfil existente porque tiene datos relacionados. Revise el usuario manualmente.';
      end;
    end if;

    profile_role := v_profile.role::text;
    return next;
    return;
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    is_active
  )
  values (
    v_auth_user_id,
    coalesce(left(v_full_name, 120), split_part(v_email, '@', 1)),
    v_email,
    'student',
    true
  )
  returning role::text into profile_role;

  return next;
end;
$_$;


ALTER FUNCTION "public"."ensure_google_institutional_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_inventory_summary"() RETURNS TABLE("total_items" bigint, "total_stock" bigint, "total_available" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    count(*)::bigint,
    coalesce(sum(stock_total), 0)::bigint,
    coalesce(sum(stock_available), 0)::bigint
  from public.items
  where status::text = 'active';
$$;


ALTER FUNCTION "public"."get_dashboard_inventory_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_operational_summary"("p_start_date" "date", "p_end_date" "date", "p_current_date" "date", "p_upcoming_limit_date" "date") RETURNS TABLE("total_items" bigint, "total_stock" bigint, "total_available" bigint, "active_loans" bigint, "partial_loans" bigint, "overdue_loans" bigint, "returned_loans" bigint, "pending_requests" bigint, "approved_requests" bigint, "out_of_stock_items" bigint, "critical_stock_items" bigint, "maintenance_data" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if not public.is_admin_or_lab_staff() then
    raise exception 'No autorizado';
  end if;

  return query
  with inventory as (
    select
      count(*)::bigint as total_items,
      coalesce(sum(stock_total), 0)::bigint as total_stock,
      coalesce(sum(stock_available), 0)::bigint as total_available,
      count(*) filter (where stock_available = 0)::bigint as out_of_stock_items,
      count(*) filter (where stock_available > 0 and stock_available <= 2)::bigint as critical_stock_items
    from public.items
    where status::text = 'active'
  ),
  loan_counts as (
    select
      count(*) filter (
        where status = 'active'
          and (expected_return_date is null or expected_return_date >= p_current_date)
      )::bigint as active_loans,
      count(*) filter (
        where status = 'partial_return'
          and (expected_return_date is null or expected_return_date >= p_current_date)
      )::bigint as partial_loans,
      count(*) filter (
        where status in ('active', 'partial_return', 'overdue')
          and expected_return_date < p_current_date
      )::bigint as overdue_loans,
      count(*) filter (where status = 'returned')::bigint as returned_loans
    from public.loans
  ),
  request_counts as (
    select
      count(*) filter (where status = 'pending')::bigint as pending_requests,
      count(*) filter (where status = 'approved')::bigint as approved_requests
    from public.requests
  ),
  maintenance_counts as (
    select coalesce(
      jsonb_agg(jsonb_build_object('name', name, 'value', value) order by name),
      '[]'::jsonb
    ) as maintenance_data
    from (
      select
        case
          when maintenance_type = 'preventive' then 'Preventivo'
          when maintenance_type = 'corrective' then 'Correctivo'
          else 'Trabajo general'
        end as name,
        count(*)::bigint as value
      from public.maintenance_records
      where maintenance_date >= p_start_date
        and maintenance_date < p_end_date
      group by 1
    ) grouped
  )
  select
    inventory.total_items,
    inventory.total_stock,
    inventory.total_available,
    loan_counts.active_loans,
    loan_counts.partial_loans,
    loan_counts.overdue_loans,
    loan_counts.returned_loans,
    request_counts.pending_requests,
    request_counts.approved_requests,
    inventory.out_of_stock_items,
    inventory.critical_stock_items,
    maintenance_counts.maintenance_data
  from inventory
  cross join loan_counts
  cross join request_counts
  cross join maintenance_counts;
end;
$$;


ALTER FUNCTION "public"."get_dashboard_operational_summary"("p_start_date" "date", "p_end_date" "date", "p_current_date" "date", "p_upcoming_limit_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE
    AS $$
  select role
  from public.profiles
  where id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'student'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_stock"("item_id_input" "uuid", "quantity_input" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update items
  set stock_available = stock_available + quantity_input
  where id = item_id_input;
end;
$$;


ALTER FUNCTION "public"."increment_stock"("item_id_input" "uuid", "quantity_input" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_lab_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'lab_staff')
  );
$$;


ALTER FUNCTION "public"."is_admin_or_lab_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_teacher"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'teacher'
    );
  $$;


ALTER FUNCTION "public"."is_teacher"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_full_return_transaction"("p_loan_id" "uuid", "p_notes" "text" DEFAULT NULL::"text", "p_received_by" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_auth_user_id uuid := auth.uid();
  v_role text;
  v_loan_status text;
  v_return_id uuid;
  v_item record;
  v_pending_quantity integer;
  v_processed_items integer := 0;
begin
  if v_auth_user_id is null then
    raise exception 'No autenticado.';
  end if;

  if p_received_by is distinct from v_auth_user_id then
    raise exception 'El receptor debe coincidir con el usuario autenticado.';
  end if;

  select role::text
  into v_role
  from public.profiles
  where id = v_auth_user_id;

  if v_role is null or v_role not in ('admin', 'lab_staff') then
    raise exception 'No tiene permisos para registrar devoluciones.';
  end if;

  select status::text
  into v_loan_status
  from public.loans
  where id = p_loan_id
  for update;

  if not found then
    raise exception 'No se encontro el prestamo.';
  end if;

  if v_loan_status not in ('active', 'partial_return', 'overdue') then
    raise exception 'Este prestamo ya no admite devoluciones.';
  end if;

  insert into public.returns (loan_id, received_by, notes)
  values (p_loan_id, v_auth_user_id, nullif(btrim(p_notes), ''))
  returning id into v_return_id;

  for v_item in
    select
      li.id as loan_item_id,
      li.item_id,
      li.item_unit_id,
      li.quantity,
      coalesce(li.returned_quantity, 0) as returned_quantity,
      coalesce(li.missing_quantity, 0) as missing_quantity
    from public.loan_items li
    where li.loan_id = p_loan_id
    for update
  loop
    v_pending_quantity :=
      v_item.quantity - v_item.returned_quantity - v_item.missing_quantity;

    if v_pending_quantity > 0 then
      v_processed_items := v_processed_items + 1;

      if v_item.item_unit_id is not null and v_pending_quantity <> 1 then
        raise exception 'Una unidad individual debe procesarse completa.';
      end if;

      insert into public.return_items (
        return_id,
        loan_item_id,
        quantity_ok,
        quantity_damaged,
        quantity_missing,
        notes
      )
      values (
        v_return_id,
        v_item.loan_item_id,
        v_pending_quantity,
        0,
        0,
        nullif(btrim(p_notes), '')
      );

      update public.loan_items
      set returned_quantity = v_item.returned_quantity + v_pending_quantity
      where id = v_item.loan_item_id;

      update public.items
      set
        stock_available = stock_available + v_pending_quantity,
        updated_at = now()
      where id = v_item.item_id
        and stock_available + v_pending_quantity <= stock_total;

      if not found then
        raise exception 'No se pudo actualizar el stock sin superar el total.';
      end if;

      if v_item.item_unit_id is not null then
        update public.item_units
        set
          condition = 'good'::public.unit_condition,
          availability_status = 'available'::public.unit_availability,
          updated_at = now()
        where id = v_item.item_unit_id;
      end if;

      insert into public.inventory_movements (
        item_id,
        movement_type,
        quantity,
        reference_table,
        reference_id,
        notes,
        created_by
      )
      values (
        v_item.item_id,
        'return_ok',
        v_pending_quantity,
        'returns',
        v_return_id,
        nullif(btrim(p_notes), ''),
        v_auth_user_id
      );
    end if;
  end loop;

  if v_processed_items = 0 then
    raise exception 'El prestamo no tiene materiales pendientes por devolver.';
  end if;

  update public.loans
  set
    status = 'returned'::public.loan_status,
    returned_at = now(),
    updated_at = now()
  where id = p_loan_id;

  return v_return_id;
end;
$$;


ALTER FUNCTION "public"."register_full_return_transaction"("p_loan_id" "uuid", "p_notes" "text", "p_received_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_maintenance_record_transaction"("p_item_id" "uuid", "p_item_unit_id" "uuid", "p_activity" "text", "p_responsible" "text", "p_maintenance_date" "date", "p_observations" "text", "p_maintenance_type" "text", "p_mark_unit_unavailable" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_auth_user_id uuid := auth.uid();
  v_role text;
  v_record_id uuid;
  v_item record;
  v_unit record;
  v_notes text := nullif(btrim(coalesce(p_observations, '')), '');
begin
  if v_auth_user_id is null then
    raise exception 'No autenticado.';
  end if;

  select role::text
    into v_role
  from public.profiles
  where id = v_auth_user_id;

  if v_role is null or v_role not in ('admin', 'lab_staff') then
    raise exception 'No tiene permisos para registrar mantenimiento.';
  end if;

  if nullif(btrim(coalesce(p_activity, '')), '') is null
    or nullif(btrim(coalesce(p_responsible, '')), '') is null
    or p_maintenance_date is null
    or nullif(btrim(coalesce(p_maintenance_type, '')), '') is null then
    raise exception 'Faltan campos obligatorios.';
  end if;

  if p_maintenance_type not in ('preventive', 'corrective', 'general') then
    raise exception 'El tipo de mantenimiento no es válido.';
  end if;

  if p_item_id is not null then
    select id
      into v_item
    from public.items
    where id = p_item_id
      and item_type = 'equipment'
      and status = 'active'
    for update;

    if not found then
      raise exception 'El equipo seleccionado no existe, no está activo o no es válido.';
    end if;
  elsif p_item_unit_id is not null then
    raise exception 'Un trabajo general no puede tener una unidad asociada.';
  end if;

  if p_item_unit_id is not null then
    select id, item_id, availability_status::text as availability_status
      into v_unit
    from public.item_units
    where id = p_item_unit_id
      and item_id = p_item_id
    for update;

    if not found then
      raise exception 'La unidad seleccionada no pertenece al equipo.';
    end if;

    if v_unit.availability_status = 'loaned' then
      raise exception 'No se puede registrar mantenimiento sobre una unidad prestada.';
    end if;
  elsif p_mark_unit_unavailable then
    raise exception 'Debe seleccionar una unidad para marcarla como no disponible.';
  end if;

  insert into public.maintenance_records (
    item_id,
    item_unit_id,
    activity,
    responsible,
    maintenance_date,
    observations,
    maintenance_type,
    created_by
  )
  values (
    p_item_id,
    p_item_unit_id,
    btrim(p_activity),
    btrim(p_responsible),
    p_maintenance_date,
    v_notes,
    p_maintenance_type,
    v_auth_user_id
  )
  returning id into v_record_id;

  if p_item_unit_id is not null and p_mark_unit_unavailable then
    perform public.update_item_unit_status_transaction(
      p_item_unit_id,
      'maintenance',
      coalesce(
        v_notes,
        case
          when p_maintenance_type = 'preventive' then 'Mantenimiento preventivo registrado'
          when p_maintenance_type = 'corrective' then 'Mantenimiento correctivo registrado'
          else 'Trabajo general registrado'
        end
      )
    );
  end if;

  return v_record_id;
end;
$$;


ALTER FUNCTION "public"."register_maintenance_record_transaction"("p_item_id" "uuid", "p_item_unit_id" "uuid", "p_activity" "text", "p_responsible" "text", "p_maintenance_date" "date", "p_observations" "text", "p_maintenance_type" "text", "p_mark_unit_unavailable" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_return_transaction"("p_loan_item_id" "uuid", "p_quantity_ok" integer, "p_quantity_damaged" integer, "p_quantity_missing" integer, "p_notes" "text" DEFAULT NULL::"text", "p_received_by" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_auth_user_id uuid := auth.uid();
  v_role text;
  v_loan_id uuid;
  v_item_id uuid;
  v_item_unit_id uuid;
  v_loan_status text;
  v_quantity integer;
  v_returned_quantity integer;
  v_damaged_quantity integer;
  v_missing_quantity integer;
  v_pending_quantity integer;
  v_processed_quantity integer;
  v_return_id uuid;
  v_has_pending_items boolean;
begin
  if v_auth_user_id is null then raise exception 'No autenticado.'; end if;
  if p_received_by is distinct from v_auth_user_id then
    raise exception 'El receptor debe coincidir con el usuario autenticado.';
  end if;

  select role::text into v_role from public.profiles where id = v_auth_user_id;
  if v_role is null or v_role not in ('admin', 'lab_staff') then
    raise exception 'No tiene permisos para registrar devoluciones.';
  end if;

  if p_quantity_ok is null or p_quantity_ok < 0
    or p_quantity_damaged is null or p_quantity_damaged < 0
    or p_quantity_missing is null or p_quantity_missing < 0 then
    raise exception 'Las cantidades deben ser enteros no negativos.';
  end if;

  v_processed_quantity := p_quantity_ok + p_quantity_damaged + p_quantity_missing;
  if v_processed_quantity <= 0 then raise exception 'Debe registrar al menos una unidad.'; end if;

  select li.loan_id, li.item_id, li.item_unit_id, li.quantity,
         coalesce(li.returned_quantity, 0), coalesce(li.damaged_quantity, 0),
         coalesce(li.missing_quantity, 0), l.status::text
    into v_loan_id, v_item_id, v_item_unit_id, v_quantity,
         v_returned_quantity, v_damaged_quantity, v_missing_quantity, v_loan_status
  from public.loan_items li
  join public.loans l on l.id = li.loan_id
  where li.id = p_loan_item_id
  for update of li, l;

  if not found then raise exception 'No se encontró el detalle del préstamo.'; end if;
  if v_loan_status not in ('active', 'partial_return', 'overdue') then
    raise exception 'Este préstamo ya no admite devoluciones.';
  end if;

  v_pending_quantity := v_quantity - v_returned_quantity - v_missing_quantity;
  if v_processed_quantity > v_pending_quantity then
    raise exception 'La devolución excede la cantidad pendiente.';
  end if;

  if v_item_unit_id is not null and (v_quantity <> 1 or v_processed_quantity <> 1) then
    raise exception 'Una unidad individual debe procesarse completa.';
  end if;

  insert into public.returns (loan_id, received_by, notes)
  values (v_loan_id, v_auth_user_id, nullif(btrim(p_notes), ''))
  returning id into v_return_id;

  insert into public.return_items (
    return_id, loan_item_id, quantity_ok, quantity_damaged, quantity_missing, notes
  ) values (
    v_return_id, p_loan_item_id, p_quantity_ok, p_quantity_damaged,
    p_quantity_missing, nullif(btrim(p_notes), '')
  );

  update public.loan_items
  set returned_quantity = v_returned_quantity + p_quantity_ok + p_quantity_damaged,
      damaged_quantity = v_damaged_quantity + p_quantity_damaged,
      missing_quantity = v_missing_quantity + p_quantity_missing
  where id = p_loan_item_id;

  if p_quantity_ok > 0 then
    update public.items
    set stock_available = stock_available + p_quantity_ok, updated_at = now()
    where id = v_item_id and stock_available + p_quantity_ok <= stock_total;
    if not found then raise exception 'No se pudo actualizar el stock sin superar el total.'; end if;
  end if;

  if v_item_unit_id is not null then
    update public.item_units
    set condition = case
          when p_quantity_ok = 1 then 'good'::public.unit_condition
          when p_quantity_damaged = 1 then 'damaged'::public.unit_condition
          else condition
        end,
        availability_status = case
          when p_quantity_ok = 1 then 'available'::public.unit_availability
          else 'unavailable'::public.unit_availability
        end,
        updated_at = now()
    where id = v_item_unit_id;
  end if;

  select exists (
    select 1 from public.loan_items
    where loan_id = v_loan_id
      and quantity > coalesce(returned_quantity, 0) + coalesce(missing_quantity, 0)
  ) into v_has_pending_items;

  update public.loans
  set status = case
        when v_has_pending_items then 'partial_return'::public.loan_status
        else 'returned'::public.loan_status
      end,
      returned_at = case when v_has_pending_items then null else now() end,
      updated_at = now()
  where id = v_loan_id;

  if p_quantity_ok > 0 then
    insert into public.inventory_movements
      (item_id, movement_type, quantity, reference_table, reference_id, notes, created_by)
    values
      (v_item_id, 'return_ok', p_quantity_ok, 'returns', v_return_id, nullif(btrim(p_notes), ''), v_auth_user_id);
  end if;
  if p_quantity_damaged > 0 then
    insert into public.inventory_movements
      (item_id, movement_type, quantity, reference_table, reference_id, notes, created_by)
    values
      (v_item_id, 'return_damaged', p_quantity_damaged, 'returns', v_return_id, nullif(btrim(p_notes), ''), v_auth_user_id);
  end if;
  if p_quantity_missing > 0 then
    insert into public.inventory_movements
      (item_id, movement_type, quantity, reference_table, reference_id, notes, created_by)
    values
      (v_item_id, 'return_missing', p_quantity_missing, 'returns', v_return_id, nullif(btrim(p_notes), ''), v_auth_user_id);
  end if;

  return v_return_id;
end;
$$;


ALTER FUNCTION "public"."register_return_transaction"("p_loan_item_id" "uuid", "p_quantity_ok" integer, "p_quantity_damaged" integer, "p_quantity_missing" integer, "p_notes" "text", "p_received_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_request_transaction"("p_request_id" "uuid", "p_rejection_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."reject_request_transaction"("p_request_id" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_item_unit_status_transaction"("p_unit_id" "uuid", "p_condition" "text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_auth_user_id uuid := auth.uid();
  v_role text;
  v_unit record;
  v_new_availability public.unit_availability;
  v_delta integer := 0;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if v_auth_user_id is null then
    raise exception 'No autenticado.';
  end if;

  select role::text
    into v_role
  from public.profiles
  where id = v_auth_user_id;

  if v_role is null or v_role not in ('admin', 'lab_staff') then
    raise exception 'No tiene permisos para gestionar inventario.';
  end if;

  if p_condition not in ('good', 'damaged', 'maintenance', 'retired') then
    raise exception 'La condición seleccionada no es válida.';
  end if;

  select
    u.id,
    u.item_id,
    u.condition::text as current_condition,
    u.availability_status::text as current_availability,
    i.stock_total,
    i.stock_available
  into v_unit
  from public.item_units u
  join public.items i on i.id = u.item_id
  where u.id = p_unit_id
  for update of u, i;

  if not found then
    raise exception 'Unidad no encontrada.';
  end if;

  if v_unit.current_availability = 'loaned' then
    raise exception 'No se puede modificar una unidad que está prestada.';
  end if;

  v_new_availability := case
    when p_condition = 'good' then 'available'::public.unit_availability
    else 'unavailable'::public.unit_availability
  end;

  if v_unit.current_availability = 'available' and v_new_availability <> 'available' then
    v_delta := -1;
  elsif v_unit.current_availability <> 'available' and v_new_availability = 'available' then
    v_delta := 1;
  end if;

  if v_delta <> 0 then
    update public.items
    set
      stock_available = stock_available + v_delta,
      updated_at = now()
    where id = v_unit.item_id
      and stock_available + v_delta >= 0
      and stock_available + v_delta <= stock_total;

    if not found then
      raise exception 'No se pudo ajustar el stock disponible de la unidad.';
    end if;

    insert into public.inventory_movements (
      item_id,
      movement_type,
      quantity,
      reference_table,
      reference_id,
      notes,
      created_by
    )
    values (
      v_unit.item_id,
      case when v_delta > 0 then 'adjustment_up' else 'adjustment_down' end,
      1,
      'item_units',
      p_unit_id,
      coalesce(v_notes, 'Cambio de estado de unidad individual'),
      v_auth_user_id
    );
  end if;

  update public.item_units
  set
    condition = p_condition::public.unit_condition,
    availability_status = v_new_availability,
    notes = coalesce(v_notes, notes),
    updated_at = now()
  where id = p_unit_id;
end;
$$;


ALTER FUNCTION "public"."update_item_unit_status_transaction"("p_unit_id" "uuid", "p_condition" "text", "p_notes" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_import_items_staging" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "track_individual" boolean NOT NULL,
    "stock_total" integer NOT NULL,
    "stock_available" integer NOT NULL,
    "status" "text" NOT NULL,
    "location" "text"
);


ALTER TABLE "public"."inventory_import_items_staging" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_import_items_staging" IS 'Carga temporal del inventario oficial 2026-06-09. Eliminar tras finalizar la importación.';



CREATE TABLE IF NOT EXISTS "public"."inventory_import_units_staging" (
    "item_code" "text" NOT NULL,
    "asset_code" "text" NOT NULL,
    "old_code" "text",
    "serial_code" "text" NOT NULL,
    "model" "text",
    "brand" "text",
    "entry_date" "text",
    "assignment_date" "text",
    "condition" "text" NOT NULL,
    "availability_status" "text" NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."inventory_import_units_staging" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_import_units_staging" IS 'Carga temporal de unidades oficiales 2026-06-09. Eliminar tras finalizar la importación.';



CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "movement_type" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "reference_table" "text",
    "reference_id" "uuid",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_movements_movement_type_check" CHECK (("movement_type" = ANY (ARRAY['loan_out'::"text", 'return_ok'::"text", 'return_damaged'::"text", 'return_missing'::"text", 'adjustment_up'::"text", 'adjustment_down'::"text"]))),
    CONSTRAINT "inventory_movements_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."inventory_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "serial_code" "text",
    "qr_code" "text",
    "condition" "public"."unit_condition" DEFAULT 'good'::"public"."unit_condition" NOT NULL,
    "availability_status" "public"."unit_availability" DEFAULT 'available'::"public"."unit_availability" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "asset_code" "text",
    "old_code" "text",
    "model" "text",
    "brand" "text",
    "entry_date" "date",
    "assignment_date" "date"
);


ALTER TABLE "public"."item_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_units_import_staging" (
    "item_code" "text",
    "asset_code" "text",
    "old_code" "text",
    "serial_code" "text",
    "model" "text",
    "brand" "text",
    "entry_date" "date",
    "assignment_date" "date",
    "condition" "public"."unit_condition",
    "availability_status" "public"."unit_availability",
    "notes" "text"
);


ALTER TABLE "public"."item_units_import_staging" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "item_type" "public"."item_type" NOT NULL,
    "track_individual" boolean DEFAULT false NOT NULL,
    "stock_total" integer DEFAULT 0 NOT NULL,
    "stock_available" integer DEFAULT 0 NOT NULL,
    "status" "public"."item_status" DEFAULT 'active'::"public"."item_status" NOT NULL,
    "location" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "items_stock_available_check" CHECK (("stock_available" >= 0)),
    CONSTRAINT "items_stock_total_check" CHECK (("stock_total" >= 0)),
    CONSTRAINT "stock_available_not_greater_than_total" CHECK (("stock_available" <= "stock_total"))
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loan_group_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loan_group_id" "uuid",
    "item_id" "uuid",
    "quantity" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "loan_group_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."loan_group_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loan_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loan_id" "uuid",
    "request_group_id" "uuid",
    "group_name" "text" NOT NULL,
    "leader_student_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."loan_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loan_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loan_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "item_unit_id" "uuid",
    "quantity" integer NOT NULL,
    "returned_quantity" integer DEFAULT 0 NOT NULL,
    "damaged_quantity" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "missing_quantity" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "loan_items_damaged_quantity_check" CHECK (("damaged_quantity" >= 0)),
    CONSTRAINT "loan_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "loan_items_returned_quantity_check" CHECK (("returned_quantity" >= 0))
);


ALTER TABLE "public"."loan_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "delivered_by" "uuid",
    "delivery_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expected_return_date" "date",
    "returned_at" timestamp with time zone,
    "status" "public"."loan_status" DEFAULT 'active'::"public"."loan_status" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."loans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "activity" "text" NOT NULL,
    "responsible" "text" NOT NULL,
    "maintenance_date" "date" NOT NULL,
    "observations" "text",
    "maintenance_type" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "item_unit_id" "uuid",
    CONSTRAINT "maintenance_records_maintenance_type_check" CHECK (("maintenance_type" = ANY (ARRAY['preventive'::"text", 'corrective'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."maintenance_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "career" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_group_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_group_id" "uuid",
    "item_id" "uuid",
    "quantity" integer NOT NULL,
    CONSTRAINT "request_group_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."request_group_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid",
    "group_name" "text" NOT NULL,
    "leader_student_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."request_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "quantity_requested" integer NOT NULL,
    "quantity_approved" integer DEFAULT 0 NOT NULL,
    "quantity_delivered" integer DEFAULT 0 NOT NULL,
    "quantity_returned" integer DEFAULT 0 NOT NULL,
    "quantity_damaged" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "request_items_quantity_approved_check" CHECK (("quantity_approved" >= 0)),
    CONSTRAINT "request_items_quantity_damaged_check" CHECK (("quantity_damaged" >= 0)),
    CONSTRAINT "request_items_quantity_delivered_check" CHECK (("quantity_delivered" >= 0)),
    CONSTRAINT "request_items_quantity_requested_check" CHECK (("quantity_requested" > 0)),
    CONSTRAINT "request_items_quantity_returned_check" CHECK (("quantity_returned" >= 0))
);


ALTER TABLE "public"."request_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."request_status" DEFAULT 'pending'::"public"."request_status" NOT NULL,
    "purpose" "text",
    "comments" "text",
    "scheduled_return_date" "date",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."return_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_id" "uuid" NOT NULL,
    "loan_item_id" "uuid" NOT NULL,
    "quantity_ok" integer DEFAULT 0 NOT NULL,
    "quantity_damaged" integer DEFAULT 0 NOT NULL,
    "quantity_missing" integer DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "return_items_quantity_damaged_check" CHECK (("quantity_damaged" >= 0)),
    CONSTRAINT "return_items_quantity_missing_check" CHECK (("quantity_missing" >= 0)),
    CONSTRAINT "return_items_quantity_ok_check" CHECK (("quantity_ok" >= 0))
);


ALTER TABLE "public"."return_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."returns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loan_id" "uuid" NOT NULL,
    "received_by" "uuid",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."returns" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_import_items_staging"
    ADD CONSTRAINT "inventory_import_items_staging_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."inventory_import_units_staging"
    ADD CONSTRAINT "inventory_import_units_staging_pkey" PRIMARY KEY ("asset_code");



ALTER TABLE ONLY "public"."inventory_import_units_staging"
    ADD CONSTRAINT "inventory_import_units_staging_serial_code_key" UNIQUE ("serial_code");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_units"
    ADD CONSTRAINT "item_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_units"
    ADD CONSTRAINT "item_units_qr_code_key" UNIQUE ("qr_code");



ALTER TABLE ONLY "public"."item_units"
    ADD CONSTRAINT "item_units_serial_code_key" UNIQUE ("serial_code");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loan_group_items"
    ADD CONSTRAINT "loan_group_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loan_groups"
    ADD CONSTRAINT "loan_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loan_items"
    ADD CONSTRAINT "loan_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loans"
    ADD CONSTRAINT "loans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loans"
    ADD CONSTRAINT "loans_request_id_key" UNIQUE ("request_id");



ALTER TABLE ONLY "public"."maintenance_records"
    ADD CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_group_items"
    ADD CONSTRAINT "request_group_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_groups"
    ADD CONSTRAINT "request_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_items"
    ADD CONSTRAINT "request_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_inventory_movements_created_at" ON "public"."inventory_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_inventory_movements_created_by" ON "public"."inventory_movements" USING "btree" ("created_by");



CREATE INDEX "idx_inventory_movements_item_id" ON "public"."inventory_movements" USING "btree" ("item_id");



CREATE INDEX "idx_inventory_movements_reference_id" ON "public"."inventory_movements" USING "btree" ("reference_id");



CREATE INDEX "idx_item_units_availability" ON "public"."item_units" USING "btree" ("availability_status");



CREATE INDEX "idx_item_units_item_id" ON "public"."item_units" USING "btree" ("item_id");



CREATE INDEX "idx_item_units_item_id_availability_status" ON "public"."item_units" USING "btree" ("item_id", "availability_status");



CREATE INDEX "idx_items_category" ON "public"."items" USING "btree" ("category");



CREATE INDEX "idx_items_status" ON "public"."items" USING "btree" ("status");



CREATE INDEX "idx_loan_items_loan_id" ON "public"."loan_items" USING "btree" ("loan_id");



CREATE INDEX "idx_loans_expected_return_date" ON "public"."loans" USING "btree" ("expected_return_date");



CREATE INDEX "idx_loans_status" ON "public"."loans" USING "btree" ("status");



CREATE INDEX "idx_loans_user_id" ON "public"."loans" USING "btree" ("user_id");



CREATE INDEX "idx_maintenance_records_item_unit_id" ON "public"."maintenance_records" USING "btree" ("item_unit_id");



CREATE INDEX "idx_maintenance_records_maintenance_date" ON "public"."maintenance_records" USING "btree" ("maintenance_date");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_request_items_request_id" ON "public"."request_items" USING "btree" ("request_id");



CREATE INDEX "idx_requests_requested_at" ON "public"."requests" USING "btree" ("requested_at");



CREATE INDEX "idx_requests_status" ON "public"."requests" USING "btree" ("status");



CREATE INDEX "idx_requests_user_id" ON "public"."requests" USING "btree" ("user_id");



CREATE INDEX "idx_return_items_created_at" ON "public"."return_items" USING "btree" ("created_at");



CREATE INDEX "idx_returns_loan_id" ON "public"."returns" USING "btree" ("loan_id");



CREATE OR REPLACE TRIGGER "trg_item_units_updated_at" BEFORE UPDATE ON "public"."item_units" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_items_updated_at" BEFORE UPDATE ON "public"."items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_loans_updated_at" BEFORE UPDATE ON "public"."loans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_requests_updated_at" BEFORE UPDATE ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_units"
    ADD CONSTRAINT "item_units_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loan_group_items"
    ADD CONSTRAINT "loan_group_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."loan_group_items"
    ADD CONSTRAINT "loan_group_items_loan_group_id_fkey" FOREIGN KEY ("loan_group_id") REFERENCES "public"."loan_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loan_groups"
    ADD CONSTRAINT "loan_groups_leader_student_id_fkey" FOREIGN KEY ("leader_student_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."loan_groups"
    ADD CONSTRAINT "loan_groups_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loan_groups"
    ADD CONSTRAINT "loan_groups_request_group_id_fkey" FOREIGN KEY ("request_group_id") REFERENCES "public"."request_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loan_items"
    ADD CONSTRAINT "loan_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."loan_items"
    ADD CONSTRAINT "loan_items_item_unit_id_fkey" FOREIGN KEY ("item_unit_id") REFERENCES "public"."item_units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loan_items"
    ADD CONSTRAINT "loan_items_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loans"
    ADD CONSTRAINT "loans_delivered_by_fkey" FOREIGN KEY ("delivered_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loans"
    ADD CONSTRAINT "loans_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loans"
    ADD CONSTRAINT "loans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."maintenance_records"
    ADD CONSTRAINT "maintenance_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."maintenance_records"
    ADD CONSTRAINT "maintenance_records_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_records"
    ADD CONSTRAINT "maintenance_records_item_unit_id_fkey" FOREIGN KEY ("item_unit_id") REFERENCES "public"."item_units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_group_items"
    ADD CONSTRAINT "request_group_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id");



ALTER TABLE ONLY "public"."request_group_items"
    ADD CONSTRAINT "request_group_items_request_group_id_fkey" FOREIGN KEY ("request_group_id") REFERENCES "public"."request_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_groups"
    ADD CONSTRAINT "request_groups_leader_student_id_fkey" FOREIGN KEY ("leader_student_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."request_groups"
    ADD CONSTRAINT "request_groups_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_items"
    ADD CONSTRAINT "request_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."request_items"
    ADD CONSTRAINT "request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_loan_item_id_fkey" FOREIGN KEY ("loan_item_id") REFERENCES "public"."loan_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



CREATE POLICY "Allow admin insert units" ON "public"."item_units" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'lab_staff'::"public"."user_role"]))))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_insert_staff" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "audit_logs_select_staff" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."inventory_import_items_staging" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_import_units_staging" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_movements_insert_staff" ON "public"."inventory_movements" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin_or_lab_staff"() AND ("auth"."uid"() = "created_by")));



CREATE POLICY "inventory_movements_select_staff" ON "public"."inventory_movements" FOR SELECT TO "authenticated" USING ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."item_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_units_import_staging" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_units_manage_staff" ON "public"."item_units" TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "item_units_select_authenticated" ON "public"."item_units" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "items_manage_staff" ON "public"."items" TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "items_select_authenticated" ON "public"."items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "items_update_staff" ON "public"."items" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."loan_group_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loan_group_items_manage_staff" ON "public"."loan_group_items" TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "loan_group_items_select_own_or_staff" ON "public"."loan_group_items" FOR SELECT TO "authenticated" USING (("public"."is_admin_or_lab_staff"() OR (EXISTS ( SELECT 1
   FROM ("public"."loan_groups" "lg"
     JOIN "public"."loans" "l" ON (("l"."id" = "lg"."loan_id")))
  WHERE (("lg"."id" = "loan_group_items"."loan_group_id") AND ("l"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."loan_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loan_groups_manage_staff" ON "public"."loan_groups" TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "loan_groups_select_own_or_staff" ON "public"."loan_groups" FOR SELECT TO "authenticated" USING (("public"."is_admin_or_lab_staff"() OR (EXISTS ( SELECT 1
   FROM "public"."loans" "l"
  WHERE (("l"."id" = "loan_groups"."loan_id") AND ("l"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."loan_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loan_items_insert_staff" ON "public"."loan_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "loan_items_select_own_or_staff" ON "public"."loan_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."loans" "l"
  WHERE (("l"."id" = "loan_items"."loan_id") AND (("l"."user_id" = "auth"."uid"()) OR "public"."is_admin_or_lab_staff"())))));



CREATE POLICY "loan_items_update_staff" ON "public"."loan_items" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."loans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loans_insert_staff" ON "public"."loans" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "loans_select_own_or_staff" ON "public"."loans" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin_or_lab_staff"()));



CREATE POLICY "loans_update_staff" ON "public"."loans" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."maintenance_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "maintenance_records_delete_staff" ON "public"."maintenance_records" FOR DELETE TO "authenticated" USING ("public"."is_admin_or_lab_staff"());



CREATE POLICY "maintenance_records_insert_staff" ON "public"."maintenance_records" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "maintenance_records_select_staff" ON "public"."maintenance_records" FOR SELECT TO "authenticated" USING ("public"."is_admin_or_lab_staff"());



CREATE POLICY "maintenance_records_update_staff" ON "public"."maintenance_records" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_staff" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin_or_lab_staff"());



CREATE POLICY "profiles_select_students_for_teachers" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("role" = 'student'::"public"."user_role") AND "public"."is_teacher"()));



CREATE POLICY "profiles_update_staff" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."request_group_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_group_items_insert_teacher_own_request_group" ON "public"."request_group_items" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_teacher"() AND (EXISTS ( SELECT 1
   FROM ("public"."request_groups" "rg"
     JOIN "public"."requests" "r" ON (("r"."id" = "rg"."request_id")))
  WHERE (("rg"."id" = "request_group_items"."request_group_id") AND ("r"."user_id" = "auth"."uid"()))))));



CREATE POLICY "request_group_items_select_own_or_staff" ON "public"."request_group_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."request_groups" "rg"
     JOIN "public"."requests" "r" ON (("r"."id" = "rg"."request_id")))
  WHERE (("rg"."id" = "request_group_items"."request_group_id") AND (("r"."user_id" = "auth"."uid"()) OR "public"."is_admin_or_lab_staff"())))));



ALTER TABLE "public"."request_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_groups_insert_teacher_own_request" ON "public"."request_groups" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_teacher"() AND (EXISTS ( SELECT 1
   FROM "public"."requests" "r"
  WHERE (("r"."id" = "request_groups"."request_id") AND ("r"."user_id" = "auth"."uid"()))))));



CREATE POLICY "request_groups_select_own_or_staff" ON "public"."request_groups" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."requests" "r"
  WHERE (("r"."id" = "request_groups"."request_id") AND (("r"."user_id" = "auth"."uid"()) OR "public"."is_admin_or_lab_staff"())))));



ALTER TABLE "public"."request_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_items_insert_own_or_staff" ON "public"."request_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."requests" "r"
  WHERE (("r"."id" = "request_items"."request_id") AND (("r"."user_id" = "auth"."uid"()) OR "public"."is_admin_or_lab_staff"())))));



CREATE POLICY "request_items_select_own_or_staff" ON "public"."request_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."requests" "r"
  WHERE (("r"."id" = "request_items"."request_id") AND (("r"."user_id" = "auth"."uid"()) OR "public"."is_admin_or_lab_staff"())))));



CREATE POLICY "request_items_update_staff" ON "public"."request_items" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "requests_insert_own" ON "public"."requests" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "requests_select_own_or_staff" ON "public"."requests" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin_or_lab_staff"()));



CREATE POLICY "requests_update_staff" ON "public"."requests" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."return_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "return_items_insert_staff" ON "public"."return_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "return_items_select_own_or_staff" ON "public"."return_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."returns" "rt"
     JOIN "public"."loans" "l" ON (("l"."id" = "rt"."loan_id")))
  WHERE (("rt"."id" = "return_items"."return_id") AND (("l"."user_id" = "auth"."uid"()) OR "public"."is_admin_or_lab_staff"())))));



CREATE POLICY "return_items_update_staff" ON "public"."return_items" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



ALTER TABLE "public"."returns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "returns_insert_staff" ON "public"."returns" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_or_lab_staff"());



CREATE POLICY "returns_select_own_or_staff" ON "public"."returns" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."loans" "l"
  WHERE (("l"."id" = "returns"."loan_id") AND (("l"."user_id" = "auth"."uid"()) OR "public"."is_admin_or_lab_staff"())))));



CREATE POLICY "returns_update_staff" ON "public"."returns" FOR UPDATE TO "authenticated" USING ("public"."is_admin_or_lab_staff"()) WITH CHECK ("public"."is_admin_or_lab_staff"());



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_request_transaction"("p_request_id" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_request_transaction"("p_request_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_request_transaction"("p_request_id" "uuid", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_own_request_transaction"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_own_request_transaction"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_own_request_transaction"("p_request_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_inventory_item_transaction"("p_code" "text", "p_name" "text", "p_description" "text", "p_category" "text", "p_item_type" "text", "p_track_individual" boolean, "p_stock_total" integer, "p_stock_available" integer, "p_status" "text", "p_location" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_inventory_item_transaction"("p_code" "text", "p_name" "text", "p_description" "text", "p_category" "text", "p_item_type" "text", "p_track_individual" boolean, "p_stock_total" integer, "p_stock_available" integer, "p_status" "text", "p_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_inventory_item_transaction"("p_code" "text", "p_name" "text", "p_description" "text", "p_category" "text", "p_item_type" "text", "p_track_individual" boolean, "p_stock_total" integer, "p_stock_available" integer, "p_status" "text", "p_location" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_loan_transaction"("p_user_id" "uuid", "p_item_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_loan_transaction"("p_user_id" "uuid", "p_item_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_loan_with_unit_transaction"("p_user_id" "uuid", "p_item_id" "uuid", "p_item_unit_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_loan_with_unit_transaction"("p_user_id" "uuid", "p_item_id" "uuid", "p_item_unit_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_multi_item_loan_transaction"("p_user_id" "uuid", "p_items" "jsonb", "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_multi_item_loan_transaction"("p_user_id" "uuid", "p_items" "jsonb", "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_multi_item_loan_transaction"("p_user_id" "uuid", "p_items" "jsonb", "p_expected_return_date" "date", "p_notes" "text", "p_delivered_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_request_transaction"("p_purpose" "text", "p_comments" "text", "p_scheduled_return_date" "date", "p_items" "jsonb", "p_groups" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_request_transaction"("p_purpose" "text", "p_comments" "text", "p_scheduled_return_date" "date", "p_items" "jsonb", "p_groups" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_request_transaction"("p_purpose" "text", "p_comments" "text", "p_scheduled_return_date" "date", "p_items" "jsonb", "p_groups" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."deliver_approved_request"("p_request_id" "uuid", "p_delivered_by" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deliver_approved_request"("p_request_id" "uuid", "p_delivered_by" "uuid", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."deliver_approved_request_with_units"("p_request_id" "uuid", "p_units" "jsonb", "p_delivered_by" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deliver_approved_request_with_units"("p_request_id" "uuid", "p_units" "jsonb", "p_delivered_by" "uuid", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."deliver_approved_request_with_units"("p_request_id" "uuid", "p_units" "jsonb", "p_items" "jsonb", "p_delivered_by" "uuid", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deliver_approved_request_with_units"("p_request_id" "uuid", "p_units" "jsonb", "p_items" "jsonb", "p_delivered_by" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deliver_approved_request_with_units"("p_request_id" "uuid", "p_units" "jsonb", "p_items" "jsonb", "p_delivered_by" "uuid", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_google_institutional_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_google_institutional_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_google_institutional_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_dashboard_inventory_summary"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_dashboard_inventory_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_inventory_summary"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_dashboard_operational_summary"("p_start_date" "date", "p_end_date" "date", "p_current_date" "date", "p_upcoming_limit_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_dashboard_operational_summary"("p_start_date" "date", "p_end_date" "date", "p_current_date" "date", "p_upcoming_limit_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_operational_summary"("p_start_date" "date", "p_end_date" "date", "p_current_date" "date", "p_upcoming_limit_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_stock"("item_id_input" "uuid", "quantity_input" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_stock"("item_id_input" "uuid", "quantity_input" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_or_lab_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_or_lab_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_lab_staff"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_teacher"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_full_return_transaction"("p_loan_id" "uuid", "p_notes" "text", "p_received_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_full_return_transaction"("p_loan_id" "uuid", "p_notes" "text", "p_received_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."register_full_return_transaction"("p_loan_id" "uuid", "p_notes" "text", "p_received_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_full_return_transaction"("p_loan_id" "uuid", "p_notes" "text", "p_received_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_maintenance_record_transaction"("p_item_id" "uuid", "p_item_unit_id" "uuid", "p_activity" "text", "p_responsible" "text", "p_maintenance_date" "date", "p_observations" "text", "p_maintenance_type" "text", "p_mark_unit_unavailable" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_maintenance_record_transaction"("p_item_id" "uuid", "p_item_unit_id" "uuid", "p_activity" "text", "p_responsible" "text", "p_maintenance_date" "date", "p_observations" "text", "p_maintenance_type" "text", "p_mark_unit_unavailable" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."register_maintenance_record_transaction"("p_item_id" "uuid", "p_item_unit_id" "uuid", "p_activity" "text", "p_responsible" "text", "p_maintenance_date" "date", "p_observations" "text", "p_maintenance_type" "text", "p_mark_unit_unavailable" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_maintenance_record_transaction"("p_item_id" "uuid", "p_item_unit_id" "uuid", "p_activity" "text", "p_responsible" "text", "p_maintenance_date" "date", "p_observations" "text", "p_maintenance_type" "text", "p_mark_unit_unavailable" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_return_transaction"("p_loan_item_id" "uuid", "p_quantity_ok" integer, "p_quantity_damaged" integer, "p_quantity_missing" integer, "p_notes" "text", "p_received_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_return_transaction"("p_loan_item_id" "uuid", "p_quantity_ok" integer, "p_quantity_damaged" integer, "p_quantity_missing" integer, "p_notes" "text", "p_received_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_return_transaction"("p_loan_item_id" "uuid", "p_quantity_ok" integer, "p_quantity_damaged" integer, "p_quantity_missing" integer, "p_notes" "text", "p_received_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_request_transaction"("p_request_id" "uuid", "p_rejection_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_request_transaction"("p_request_id" "uuid", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_request_transaction"("p_request_id" "uuid", "p_rejection_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_item_unit_status_transaction"("p_unit_id" "uuid", "p_condition" "text", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_item_unit_status_transaction"("p_unit_id" "uuid", "p_condition" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_item_unit_status_transaction"("p_unit_id" "uuid", "p_condition" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_item_unit_status_transaction"("p_unit_id" "uuid", "p_condition" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_import_items_staging" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_import_units_staging" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movements" TO "service_role";



GRANT ALL ON TABLE "public"."item_units" TO "anon";
GRANT ALL ON TABLE "public"."item_units" TO "authenticated";
GRANT ALL ON TABLE "public"."item_units" TO "service_role";



GRANT ALL ON TABLE "public"."item_units_import_staging" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."loan_group_items" TO "authenticated";
GRANT ALL ON TABLE "public"."loan_group_items" TO "service_role";



GRANT ALL ON TABLE "public"."loan_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."loan_groups" TO "service_role";



GRANT ALL ON TABLE "public"."loan_items" TO "anon";
GRANT ALL ON TABLE "public"."loan_items" TO "authenticated";
GRANT ALL ON TABLE "public"."loan_items" TO "service_role";



GRANT ALL ON TABLE "public"."loans" TO "anon";
GRANT ALL ON TABLE "public"."loans" TO "authenticated";
GRANT ALL ON TABLE "public"."loans" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_records" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."request_group_items" TO "anon";
GRANT ALL ON TABLE "public"."request_group_items" TO "authenticated";
GRANT ALL ON TABLE "public"."request_group_items" TO "service_role";



GRANT ALL ON TABLE "public"."request_groups" TO "anon";
GRANT ALL ON TABLE "public"."request_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."request_groups" TO "service_role";



GRANT ALL ON TABLE "public"."request_items" TO "anon";
GRANT ALL ON TABLE "public"."request_items" TO "authenticated";
GRANT ALL ON TABLE "public"."request_items" TO "service_role";



GRANT ALL ON TABLE "public"."requests" TO "anon";
GRANT ALL ON TABLE "public"."requests" TO "authenticated";
GRANT ALL ON TABLE "public"."requests" TO "service_role";



GRANT ALL ON TABLE "public"."return_items" TO "anon";
GRANT ALL ON TABLE "public"."return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."return_items" TO "service_role";



GRANT ALL ON TABLE "public"."returns" TO "anon";
GRANT ALL ON TABLE "public"."returns" TO "authenticated";
GRANT ALL ON TABLE "public"."returns" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







