begin;

-- Los registros históricos permanecen sin evidencia de aceptación. Las nuevas
-- solicitudes y préstamos creados por las RPC públicas deben completar juntos
-- actor, fecha y versión de los términos.
alter table public.requests
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists terms_accepted_by uuid references public.profiles(id) on delete restrict;

alter table public.loans
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists terms_accepted_by uuid references public.profiles(id) on delete restrict;

alter table public.requests
  drop constraint if exists requests_terms_acceptance_complete,
  add constraint requests_terms_acceptance_complete check (
    (terms_accepted_at is null and terms_version is null and terms_accepted_by is null)
    or
    (terms_accepted_at is not null and terms_version is not null and terms_accepted_by is not null)
  );

alter table public.loans
  drop constraint if exists loans_terms_acceptance_complete,
  add constraint loans_terms_acceptance_complete check (
    (terms_accepted_at is null and terms_version is null and terms_accepted_by is null)
    or
    (terms_accepted_at is not null and terms_version is not null and terms_accepted_by is not null)
  );

comment on column public.requests.terms_accepted_at is
  'Fecha y hora en que el solicitante aceptó los términos del préstamo.';
comment on column public.requests.terms_version is
  'Versión inmutable de los términos aceptados por el solicitante.';
comment on column public.requests.terms_accepted_by is
  'Perfil autenticado que aceptó los términos al crear la solicitud.';
comment on column public.loans.terms_accepted_at is
  'Fecha y hora en que se aceptaron los términos al registrar el préstamo directo.';
comment on column public.loans.terms_version is
  'Versión inmutable de los términos aceptados al registrar el préstamo directo.';
comment on column public.loans.terms_accepted_by is
  'Perfil autenticado que aceptó los términos al registrar el préstamo directo.';

-- Se retiran las firmas públicas anteriores para impedir que un cliente omita
-- el consentimiento llamándolas directamente. Las implementaciones internas
-- continúan sin EXECUTE y las tablas continúan con SELECT únicamente para
-- authenticated, según el hardening vigente.
drop function if exists public.create_request_transaction(text, text, date, jsonb, jsonb);
drop function if exists public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid);

create function public.create_request_transaction(
  p_purpose text,
  p_comments text,
  p_scheduled_return_date date,
  p_items jsonb,
  p_groups jsonb,
  p_terms_accepted boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
begin
  perform public.assert_active_role(array['teacher', 'student']);

  if p_terms_accepted is not true then
    raise exception 'Debe aceptar los términos y condiciones antes de enviar la solicitud.';
  end if;

  v_request_id := public.create_request_transaction_security_impl_20260910(
    p_purpose,
    p_comments,
    p_scheduled_return_date,
    p_items,
    p_groups
  );

  update public.requests
  set
    terms_accepted_at = statement_timestamp(),
    terms_version = '2026-09-22-v1',
    terms_accepted_by = auth.uid()
  where id = v_request_id
    and user_id = auth.uid();

  if not found then
    raise exception 'No se pudo registrar la aceptación de los términos.';
  end if;

  return v_request_id;
end;
$$;

create function public.create_multi_item_loan_transaction(
  p_user_id uuid,
  p_items jsonb,
  p_expected_return_date date,
  p_notes text,
  p_delivered_by uuid,
  p_terms_accepted boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loan_id uuid;
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);

  if p_terms_accepted is not true then
    raise exception 'Debe aceptar los términos y condiciones antes de registrar el préstamo.';
  end if;

  if p_delivered_by is distinct from auth.uid() then
    raise exception 'El responsable de la entrega no coincide con el usuario autenticado.';
  end if;

  v_loan_id := public.create_multi_item_loan_transaction_security_impl_20260910(
    p_user_id,
    p_items,
    p_expected_return_date,
    p_notes,
    p_delivered_by
  );

  update public.loans
  set
    terms_accepted_at = statement_timestamp(),
    terms_version = '2026-09-22-v1',
    terms_accepted_by = auth.uid()
  where id = v_loan_id
    and delivered_by = auth.uid();

  if not found then
    raise exception 'No se pudo registrar la aceptación de los términos.';
  end if;

  return v_loan_id;
end;
$$;

revoke all on function public.create_request_transaction(text, text, date, jsonb, jsonb, boolean)
  from public, anon, service_role;
grant execute on function public.create_request_transaction(text, text, date, jsonb, jsonb, boolean)
  to authenticated;

revoke all on function public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid, boolean)
  from public, anon, service_role;
grant execute on function public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid, boolean)
  to authenticated;

-- Reafirma que las implementaciones internas no son invocables por clientes.
revoke all on function public.create_request_transaction_security_impl_20260910(text, text, date, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.create_multi_item_loan_transaction_security_impl_20260910(uuid, jsonb, date, text, uuid)
  from public, anon, authenticated, service_role;

commit;
