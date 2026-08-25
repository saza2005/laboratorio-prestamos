-- Cancela una solicitud propia pendiente dentro de una transacción.

create or replace function public.cancel_own_request_transaction(
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

revoke all on function public.cancel_own_request_transaction(uuid)
from public;

grant execute on function public.cancel_own_request_transaction(uuid)
to authenticated;
