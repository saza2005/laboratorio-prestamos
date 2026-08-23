-- Crea un ítem y sus unidades individuales en una única transacción.
-- La generación de unidades ocurre en PostgreSQL para evitar arreglos grandes en Node.js.

create or replace function public.create_inventory_item_transaction(
  p_code text,
  p_name text,
  p_description text,
  p_category text,
  p_item_type text,
  p_track_individual boolean,
  p_stock_total integer,
  p_stock_available integer,
  p_status text,
  p_location text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

revoke all on function public.create_inventory_item_transaction(
  text,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer,
  text,
  text
) from public;

grant execute on function public.create_inventory_item_transaction(
  text,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer,
  text,
  text
) to authenticated;
