-- Registra en una sola transaccion la devolucion completa de todo lo pendiente
-- de un prestamo, asumiendo que todo vuelve en buen estado.

create or replace function public.register_full_return_transaction(
  p_loan_id uuid,
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

revoke all on function public.register_full_return_transaction(
  uuid, text, uuid
) from public;

grant execute on function public.register_full_return_transaction(
  uuid, text, uuid
) to authenticated;
