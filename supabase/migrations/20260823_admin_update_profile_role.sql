-- Administración segura de roles: solo admin, sin auto-modificación ni asignación de admin.

begin;

drop policy if exists profiles_update_staff
on public.profiles;

create or replace function public.update_profile_role(
  p_profile_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role public.profiles.role%type;
  v_actor_active boolean;
  v_target_role public.profiles.role%type;
  v_next_role public.profiles.role%type;
begin
  if v_actor_id is null then
    raise exception 'No autenticado.';
  end if;

  if p_role is null or p_role not in ('student', 'teacher', 'lab_staff') then
    raise exception 'Rol no permitido.';
  end if;

  select role, is_active
  into v_actor_role, v_actor_active
  from public.profiles
  where id = v_actor_id;

  if v_actor_role::text <> 'admin' or v_actor_active is not true then
    raise exception 'No autorizado para administrar roles.';
  end if;

  if p_profile_id is null or p_profile_id = v_actor_id then
    raise exception 'No puede modificar su propio rol.';
  end if;

  select role
  into v_target_role
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'Perfil no encontrado.';
  end if;

  if v_target_role::text = 'admin' then
    raise exception 'Las cuentas administradoras están protegidas.';
  end if;

  v_next_role := p_role;

  update public.profiles
  set role = v_next_role
  where id = p_profile_id
    and role = v_target_role;

  if not found then
    raise exception 'No se pudo actualizar el perfil.';
  end if;
end;
$$;

revoke all on function public.update_profile_role(uuid, text) from public;
revoke all on function public.update_profile_role(uuid, text) from anon;
grant execute on function public.update_profile_role(uuid, text) to authenticated;

commit;
