create or replace function public.register_maintenance_record_transaction(
  p_item_id uuid,
  p_item_unit_id uuid,
  p_activity text,
  p_responsible text,
  p_maintenance_date date,
  p_observations text,
  p_maintenance_type text,
  p_mark_unit_unavailable boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  if p_item_id is null and p_maintenance_type <> 'general' then
    raise exception 'Un trabajo general debe registrarse con tipo Trabajo general.';
  end if;

  if p_item_id is not null and p_maintenance_type = 'general' then
    raise exception 'El tipo Trabajo general solo puede usarse sin seleccionar equipo.';
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

revoke all on function public.register_maintenance_record_transaction(
  uuid, uuid, text, text, date, text, text, boolean
) from public;

grant execute on function public.register_maintenance_record_transaction(
  uuid, uuid, text, text, date, text, text, boolean
) to authenticated;
