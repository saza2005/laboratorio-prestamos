alter type public.unit_condition
  add value if not exists 'maintenance';

alter type public.unit_condition
  add value if not exists 'retired';

create or replace function public.update_item_unit_status_transaction(
  p_unit_id uuid,
  p_condition text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

revoke all on function public.update_item_unit_status_transaction(uuid, text, text)
from public;

grant execute on function public.update_item_unit_status_transaction(uuid, text, text)
to authenticated;
