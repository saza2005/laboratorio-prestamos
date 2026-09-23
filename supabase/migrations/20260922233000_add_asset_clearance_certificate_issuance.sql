-- Fase 3A de certificados de no adeudo: emisión institucional segura.
-- No genera PDFs ni almacena archivos.

begin;

create sequence public.asset_clearance_certificate_code_seq;

revoke all on sequence public.asset_clearance_certificate_code_seq
  from public, anon, authenticated, service_role;

create table public.asset_clearance_certificate_documents (
  certificate_id uuid primary key
    references public.asset_clearance_certificates(id) on delete restrict,
  issued_by uuid not null
    references public.profiles(id) on delete restrict,
  issued_at timestamptz not null,
  document_version text not null,
  content_snapshot jsonb not null,
  document_sha256 text,
  created_at timestamptz not null default statement_timestamp(),
  constraint asset_clearance_certificate_documents_version_not_blank
    check (nullif(btrim(document_version), '') is not null),
  constraint asset_clearance_certificate_documents_snapshot_is_object
    check (jsonb_typeof(content_snapshot) = 'object'),
  constraint asset_clearance_certificate_documents_sha256_format
    check (
      document_sha256 is null
      or document_sha256 ~ '^[0-9a-f]{64}$'
    )
);

comment on table public.asset_clearance_certificate_documents is
  'Registro privado e inmutable de la emisión de certificados de no adeudo. No contiene archivos PDF.';
comment on column public.asset_clearance_certificate_documents.content_snapshot is
  'Contenido institucional inmutable utilizado por una futura fase de renderizado.';
comment on column public.asset_clearance_certificate_documents.document_sha256 is
  'Hash SHA-256 opcional reservado para verificar un documento generado en una fase posterior.';

create index asset_clearance_certificate_documents_issued_at_idx
  on public.asset_clearance_certificate_documents (issued_at desc);
create index asset_clearance_certificate_documents_issued_by_idx
  on public.asset_clearance_certificate_documents (issued_by, issued_at desc);

alter table public.asset_clearance_certificate_documents enable row level security;

create policy asset_clearance_certificate_documents_select_active_staff
on public.asset_clearance_certificate_documents
for select
to authenticated
using (public.is_admin_or_lab_staff());

revoke all on table public.asset_clearance_certificate_documents
  from public, anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.asset_clearance_certificate_documents from authenticated;
grant select on table public.asset_clearance_certificate_documents
  to authenticated;

create function public.generate_asset_clearance_certificate(
  p_certificate_id uuid
) returns table (
  certificate_id uuid,
  certificate_code text,
  issued_at timestamptz,
  document_version text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_certificate public.asset_clearance_certificates%rowtype;
  v_existing_document public.asset_clearance_certificate_documents%rowtype;
  v_applicant public.profiles%rowtype;
  v_issuer public.profiles%rowtype;
  v_eligibility jsonb;
  v_issued_at timestamptz := statement_timestamp();
  v_document_version constant text := '2026.1';
  v_certificate_code text;
  v_total_loans bigint;
  v_total_units_loaned bigint;
  v_distinct_items_used bigint;
  v_last_loan_at timestamptz;
  v_snapshot jsonb;
begin
  perform public.assert_active_role(array['admin', 'lab_staff']);

  if p_certificate_id is null then
    raise exception 'Debe indicar la solicitud de certificado.';
  end if;

  select certificate.*
    into v_certificate
  from public.asset_clearance_certificates as certificate
  where certificate.id = p_certificate_id
  for update;

  if not found then
    raise exception 'La solicitud de certificado no existe.';
  end if;

  -- Una repetición devuelve exactamente la emisión existente. No consume otro
  -- número de secuencia ni crea un segundo documento.
  if v_certificate.status = 'generated' then
    select document.*
      into v_existing_document
    from public.asset_clearance_certificate_documents as document
    where document.certificate_id = v_certificate.id;

    if not found then
      raise exception 'El certificado emitido no tiene un registro documental consistente.';
    end if;

    return query
    select
      v_certificate.id,
      v_certificate.certificate_code,
      v_existing_document.issued_at,
      v_existing_document.document_version;
    return;
  end if;

  if v_certificate.status <> 'approved' then
    raise exception 'Solo se puede emitir una solicitud aprobada.';
  end if;

  v_eligibility := public.evaluate_asset_clearance_eligibility_20260922(
    v_certificate.applicant_id
  );

  if coalesce((v_eligibility ->> 'eligible')::boolean, false) is not true then
    raise exception 'No se puede emitir: el solicitante mantiene obligaciones de bienes.';
  end if;

  select profile.*
    into v_applicant
  from public.profiles as profile
  where profile.id = v_certificate.applicant_id;

  if not found then
    raise exception 'El perfil del solicitante no existe.';
  end if;

  select profile.*
    into v_issuer
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.is_active is true
    and profile.role in ('admin', 'lab_staff');

  if not found then
    raise exception 'Cuenta inactiva o sin permisos para esta operación.';
  end if;

  select
    count(distinct loan.id),
    coalesce(sum(loan_item.quantity), 0),
    count(distinct loan_item.item_id),
    max(loan.delivery_date)
  into
    v_total_loans,
    v_total_units_loaned,
    v_distinct_items_used,
    v_last_loan_at
  from public.loans as loan
  left join public.loan_items as loan_item on loan_item.loan_id = loan.id
  where loan.user_id = v_certificate.applicant_id
    and loan.status <> 'cancelled';

  v_certificate_code := format(
    'LM-%s-%s',
    to_char(v_issued_at at time zone 'America/Guayaquil', 'YYYY'),
    lpad(nextval('public.asset_clearance_certificate_code_seq')::text, 6, '0')
  );

  v_snapshot := jsonb_build_object(
    'document_version', v_document_version,
    'institution', jsonb_build_object(
      'name', 'Universidad de Cuenca',
      'laboratory', 'Laboratorio de Máquinas'
    ),
    'certificate', jsonb_build_object(
      'id', v_certificate.id,
      'code', v_certificate_code,
      'issued_at', v_issued_at,
      'approved_at', v_certificate.approved_at
    ),
    'applicant', jsonb_build_object(
      'id', v_applicant.id,
      'full_name', v_applicant.full_name,
      'email', v_applicant.email,
      'role', v_applicant.role,
      'career', v_applicant.career
    ),
    'eligibility', v_eligibility,
    'loan_history', jsonb_build_object(
      'total_loans', coalesce(v_total_loans, 0),
      'total_units_loaned', coalesce(v_total_units_loaned, 0),
      'distinct_items_used', coalesce(v_distinct_items_used, 0),
      'last_loan_at', v_last_loan_at
    ),
    'issuer', jsonb_build_object(
      'id', v_issuer.id,
      'full_name', v_issuer.full_name,
      'role', v_issuer.role
    ),
    'signatory', jsonb_build_object(
      'name', 'Ing. Francisco Sanchez',
      'title', 'Laboratorista',
      'signature_method', 'physical'
    )
  );

  insert into public.asset_clearance_certificate_documents (
    certificate_id,
    issued_by,
    issued_at,
    document_version,
    content_snapshot
  ) values (
    v_certificate.id,
    v_issuer.id,
    v_issued_at,
    v_document_version,
    v_snapshot
  );

  update public.asset_clearance_certificates
  set
    status = 'generated',
    generated_at = v_issued_at,
    certificate_code = v_certificate_code,
    evaluation_snapshot = v_eligibility,
    signatory_name = 'Ing. Francisco Sanchez',
    signatory_title = 'Laboratorista'
  where id = v_certificate.id;

  return query
  select
    v_certificate.id,
    v_certificate_code,
    v_issued_at,
    v_document_version;
end;
$$;

revoke all on function public.generate_asset_clearance_certificate(uuid)
  from public, anon, service_role;
grant execute on function public.generate_asset_clearance_certificate(uuid)
  to authenticated;

commit;
