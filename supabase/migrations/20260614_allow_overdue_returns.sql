-- Permite registrar devoluciones de préstamos vencidos sin alterar el resto del flujo.

create or replace function public.register_return_transaction(
  p_loan_item_id uuid,
  p_quantity_ok integer,
  p_quantity_damaged integer,
  p_quantity_missing integer,
  p_notes text default null,
  p_received_by uuid default auth.uid()
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

revoke all on function public.register_return_transaction(
  uuid, integer, integer, integer, text, uuid
) from public;

grant execute on function public.register_return_transaction(
  uuid, integer, integer, integer, text, uuid
) to authenticated;
