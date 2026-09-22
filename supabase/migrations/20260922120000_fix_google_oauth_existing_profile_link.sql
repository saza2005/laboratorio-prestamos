-- Permite que cuentas institucionales heredadas se vinculen con Google OAuth
-- sin depender del proveedor primario histórico de auth.users.
--
-- La identidad se comprueba directamente en auth.identities y auth.users. La
-- función no recibe correo, id, rol ni estado desde el cliente. Un perfil con
-- el mismo correo y otro UUID continúa bloqueado para evitar apropiaciones.

begin;

create or replace function public.ensure_google_institutional_profile()
returns table(profile_role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_jwt_email text := lower(nullif(btrim(auth.jwt() ->> 'email'), ''));
  v_auth_email text;
  v_full_name text := nullif(
    btrim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name', '')),
    ''
  );
  v_existing_role public.user_role;
begin
  if v_user_id is null then
    raise exception 'No autenticado.';
  end if;

  select lower(nullif(btrim(auth_user.email), ''))
    into v_auth_email
  from auth.users as auth_user
  where auth_user.id = v_user_id
    and auth_user.email_confirmed_at is not null;

  if v_auth_email is null or v_auth_email <> v_jwt_email then
    raise exception 'El correo autenticado no está confirmado.';
  end if;

  if v_auth_email !~ '^[^[:space:]@]+@ucuenca[.]edu[.]ec$' then
    raise exception 'Solo se permiten correos institucionales @ucuenca.edu.ec';
  end if;

  if not exists (
    select 1
    from auth.identities as identity
    where identity.user_id = v_user_id
      and identity.provider = 'google'
      and lower(nullif(btrim(identity.identity_data ->> 'email'), '')) = v_auth_email
      and lower(coalesce(identity.identity_data ->> 'email_verified', 'false')) = 'true'
  ) then
    raise exception 'El perfil debe vincularse mediante una identidad Google verificada.';
  end if;

  -- Serializa altas concurrentes del mismo correo. No concede privilegios: el
  -- correo se deriva exclusivamente de Auth y el rol de un alta siempre es student.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_auth_email, 0));

  select profile.role
    into v_existing_role
  from public.profiles as profile
  where profile.id = v_user_id
  for update;

  if found then
    profile_role := v_existing_role::text;
    return next;
    return;
  end if;

  if exists (
    select 1
    from public.profiles as profile
    where lower(profile.email) = v_auth_email
      and profile.id <> v_user_id
  ) then
    raise exception 'El correo institucional ya está vinculado a otro perfil.';
  end if;

  insert into public.profiles (id, full_name, email, role, is_active)
  values (
    v_user_id,
    left(coalesce(v_full_name, split_part(v_auth_email, '@', 1)), 120),
    v_auth_email,
    'student'::public.user_role,
    true
  )
  on conflict (id) do nothing;

  select profile.role
    into v_existing_role
  from public.profiles as profile
  where profile.id = v_user_id;

  if v_existing_role is null then
    raise exception 'No se pudo crear o recuperar el perfil institucional.';
  end if;

  profile_role := v_existing_role::text;
  return next;
end;
$$;

revoke all on function public.ensure_google_institutional_profile() from public, anon, service_role;
grant execute on function public.ensure_google_institutional_profile() to authenticated;

commit;
