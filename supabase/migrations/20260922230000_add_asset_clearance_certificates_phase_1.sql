-- Fase 1 de certificados de no adeudo: solicitud, evaluación y revisión.
-- No genera PDFs ni modifica préstamos, devoluciones o inventario existentes.

begin;

create type public.asset_clearance_certificate_status as enum (
  'pending',
  'approved',
  'rejected',
  'generated'
);

create table public.asset_clearance_certificates (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete restrict,
  status public.asset_clearance_certificate_status not null default 'pending',
  requested_at timestamptz not null default statement_timestamp(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  generated_at timestamptz,
  certificate_code text unique,
  observations text,
  rejection_reason text,
  evaluation_snapshot jsonb not null,
  signatory_name text not null default 'Ing. Francisco Sanchez',
  signatory_title text not null default 'Laboratorista',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint asset_clearance_certificates_snapshot_is_object
    check (jsonb_typeof(evaluation_snapshot) = 'object'),
  constraint asset_clearance_certificates_lifecycle check (
    (
      status = 'pending'
      and reviewed_at is null
      and reviewed_by is null
      and approved_at is null
      and generated_at is null
      and certificate_code is null
      and rejection_reason is null
    )
    or
    (
      status = 'approved'
      and reviewed_at is not null
      and reviewed_by is not null
      and approved_at is not null
      and generated_at is null
      and certificate_code is null
      and rejection_reason is null
    )
    or
    (
      status = 'rejected'
      and reviewed_at is not null
      and reviewed_by is not null
      and approved_at is null
      and generated_at is null
      and certificate_code is null
      and nullif(btrim(rejection_reason), '') is not null
    )
    or
    (
      status = 'generated'
      and reviewed_at is not null
      and reviewed_by is not null
      and approved_at is not null
      and generated_at is not null
      and nullif(btrim(certificate_code), '') is not null
      and rejection_reason is null
    )
  )
);

comment on table public.asset_clearance_certificates is
  'Solicitudes y futuras emisiones de certificados de no adeudo de bienes.';
comment on column public.asset_clearance_certificates.evaluation_snapshot is
  'Resultado inmutable de la última evaluación realizada al solicitar o revisar.';
comment on column public.asset_clearance_certificates.certificate_code is
  'Código único reservado para la fase futura de emisión y generación del documento.';
comment on column public.asset_clearance_certificates.signatory_name is
  'Nombre que deberá constar para la firma física del certificado.';
comment on column public.asset_clearance_certificates.signatory_title is
  'Cargo institucional del responsable de la firma física.';

create index asset_clearance_certificates_applicant_requested_idx
  on public.asset_clearance_certificates (applicant_id, requested_at desc);
create index asset_clearance_certificates_status_requested_idx
  on public.asset_clearance_certificates (status, requested_at desc);
create unique index asset_clearance_certificates_one_open_per_applicant_idx
  on public.asset_clearance_certificates (applicant_id)
  where status in ('pending', 'approved');

create trigger trg_asset_clearance_certificates_updated_at
before update on public.asset_clearance_certificates
for each row execute function public.set_updated_at();

alter table public.asset_clearance_certificates enable row level security;

create policy asset_clearance_certificates_select_own_or_staff
on public.asset_clearance_certificates
for select
to authenticated
using (
  public.is_admin_or_lab_staff()
  or (public.is_active_user() and applicant_id = auth.uid())
);

-- Las escrituras directas se prohíben. Las RPC derivan actor, rol, estado y
-- fechas desde la sesión autenticada y ejecutan las transiciones permitidas.
revoke all on table public.asset_clearance_certificates from public, anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.asset_clearance_certificates from authenticated;
grant select on table public.asset_clearance_certificates to authenticated;

create function public.evaluate_asset_clearance_eligibility_20260922(
  p_applicant_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_active_loans integer;
  v_partial_returns integer;
  v_overdue_loans integer;
  v_pending_items integer;
  v_missing_units integer;
  v_damaged_units integer;
  v_today date := (statement_timestamp() at time zone 'America/Guayaquil')::date;
begin
  select
    count(*) filter (where loan.status = 'active')::integer,
    count(*) filter (where loan.status = 'partial_return')::integer,
    count(*) filter (
      where loan.status = 'overdue'
        or (
          loan.status in ('active', 'partial_return')
          and loan.expected_return_date is not null
          and loan.expected_return_date < v_today
        )
    )::integer
  into v_active_loans, v_partial_returns, v_overdue_loans
  from public.loans as loan
  where loan.user_id = p_applicant_id;

  select
    count(*) filter (
      where loan_item.quantity
        > coalesce(loan_item.returned_quantity, 0) + coalesce(loan_item.missing_quantity, 0)
    )::integer,
    coalesce(sum(loan_item.missing_quantity), 0)::integer,
    coalesce(sum(loan_item.damaged_quantity), 0)::integer
  into v_pending_items, v_missing_units, v_damaged_units
  from public.loan_items as loan_item
  join public.loans as loan on loan.id = loan_item.loan_id
  where loan.user_id = p_applicant_id
    and loan.status <> 'cancelled';

  return jsonb_build_object(
    'rule_version', '2026-09-22-v1',
    'checked_at', statement_timestamp(),
    'eligible',
      coalesce(v_active_loans, 0) = 0
      and coalesce(v_partial_returns, 0) = 0
      and coalesce(v_overdue_loans, 0) = 0
      and coalesce(v_pending_items, 0) = 0
      and coalesce(v_missing_units, 0) = 0
      and coalesce(v_damaged_units, 0) = 0,
    'blockers', jsonb_build_object(
      'active_loans', coalesce(v_active_loans, 0),
      'partial_returns', coalesce(v_partial_returns, 0),
      'overdue_loans', coalesce(v_overdue_loans, 0),
      'pending_items', coalesce(v_pending_items, 0),
      'missing_units', coalesce(v_missing_units, 0),
      'damaged_units', coalesce(v_damaged_units, 0),
      'damaged_units_require_manual_review', coalesce(v_damaged_units, 0) > 0
    )
  );
end;
$$;

revoke all on function public.evaluate_asset_clearance_eligibility_20260922(uuid)
  from public, anon, authenticated, service_role;

create function public.request_asset_clearance_certificate()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_certificate_id uuid;
  v_snapshot jsonb;
begin
  perform public.assert_active_role(array['student', 'teacher']);

  v_snapshot := public.evaluate_asset_clearance_eligibility_20260922(auth.uid());

  begin
    insert into public.asset_clearance_certificates (
      applicant_id,
      evaluation_snapshot,
      signatory_name,
      signatory_title
    ) values (
      auth.uid(),
      v_snapshot,
      'Ing. Francisco Sanchez',
      'Laboratorista'
    )
    returning id into v_certificate_id;
  exception
    when unique_violation then
      raise exception 'Ya existe una solicitud de certificado pendiente o aprobada.';
  end;

  return v_certificate_id;
end;
$$;

create function public.review_asset_clearance_certificate(
  p_certificate_id uuid,
  p_decision text,
  p_observations text default null,
  p_rejection_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_applicant_id uuid;
  v_status public.asset_clearance_certificate_status;
  v_snapshot jsonb;
  v_decision text := lower(nullif(btrim(p_decision), ''));
  v_rejection_reason text := nullif(btrim(p_rejection_reason), '');
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);

  if v_decision is null or v_decision not in ('approved', 'rejected') then
    raise exception 'La decisión debe ser approved o rejected.';
  end if;

  select certificate.applicant_id, certificate.status
    into v_applicant_id, v_status
  from public.asset_clearance_certificates as certificate
  where certificate.id = p_certificate_id
  for update;

  if not found then
    raise exception 'La solicitud de certificado no existe.';
  end if;

  if v_status <> 'pending' then
    raise exception 'La solicitud ya fue revisada.';
  end if;

  v_snapshot := public.evaluate_asset_clearance_eligibility_20260922(v_applicant_id);

  if v_decision = 'approved' and coalesce((v_snapshot ->> 'eligible')::boolean, false) is not true then
    raise exception 'No se puede aprobar: el solicitante mantiene obligaciones de bienes.';
  end if;

  if v_decision = 'rejected' and v_rejection_reason is null then
    raise exception 'Debe registrar el motivo del rechazo.';
  end if;

  update public.asset_clearance_certificates
  set
    status = v_decision::public.asset_clearance_certificate_status,
    reviewed_at = statement_timestamp(),
    reviewed_by = auth.uid(),
    approved_at = case when v_decision = 'approved' then statement_timestamp() else null end,
    observations = nullif(btrim(p_observations), ''),
    rejection_reason = case when v_decision = 'rejected' then v_rejection_reason else null end,
    evaluation_snapshot = v_snapshot
  where id = p_certificate_id;

  return p_certificate_id;
end;
$$;

revoke all on function public.request_asset_clearance_certificate()
  from public, anon, service_role;
grant execute on function public.request_asset_clearance_certificate()
  to authenticated;

revoke all on function public.review_asset_clearance_certificate(uuid, text, text, text)
  from public, anon, service_role;
grant execute on function public.review_asset_clearance_certificate(uuid, text, text, text)
  to authenticated;

commit;
