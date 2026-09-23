-- Prueba transaccional local de la fase 3A. Todos los fixtures se revierten.
begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin.phase3a-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'staff.phase3a-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'teacher.phase3a-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'student.phase3a-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'staff-target.phase3a-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'debtor.phase3a-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now());

insert into public.profiles (id, full_name, email, role, is_active) values
  ('81000000-0000-0000-0000-000000000001', 'Phase 3A Admin', 'admin.phase3a-test@ucuenca.edu.ec', 'admin', true),
  ('81000000-0000-0000-0000-000000000002', 'Phase 3A Staff', 'staff.phase3a-test@ucuenca.edu.ec', 'lab_staff', true),
  ('81000000-0000-0000-0000-000000000003', 'Phase 3A Teacher', 'teacher.phase3a-test@ucuenca.edu.ec', 'teacher', true),
  ('81000000-0000-0000-0000-000000000004', 'Phase 3A Student', 'student.phase3a-test@ucuenca.edu.ec', 'student', true),
  ('81000000-0000-0000-0000-000000000005', 'Phase 3A Staff Target', 'staff-target.phase3a-test@ucuenca.edu.ec', 'student', true),
  ('81000000-0000-0000-0000-000000000006', 'Phase 3A Debtor', 'debtor.phase3a-test@ucuenca.edu.ec', 'student', true);

insert into public.asset_clearance_certificates (
  id, applicant_id, status, reviewed_at, reviewed_by, approved_at,
  observations, evaluation_snapshot
) values
  ('82000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000004', 'approved', now(), '81000000-0000-0000-0000-000000000001', now(), 'Aprobado para prueba admin', '{"eligible":true}'::jsonb),
  ('82000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000003', 'approved', now(), '81000000-0000-0000-0000-000000000001', now(), 'Aprobado para prueba de rol', '{"eligible":true}'::jsonb),
  ('82000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000005', 'approved', now(), '81000000-0000-0000-0000-000000000001', now(), 'Aprobado para prueba staff', '{"eligible":true}'::jsonb),
  ('82000000-0000-0000-0000-000000000004', '81000000-0000-0000-0000-000000000006', 'approved', now(), '81000000-0000-0000-0000-000000000001', now(), 'Aprobado antes de adquirir obligación', '{"eligible":true}'::jsonb);

insert into public.items (id, code, name, item_type, stock_total, stock_available, status)
values ('83000000-0000-0000-0000-000000000001', 'PHASE3A-ITEM', 'Phase 3A test item', 'equipment', 1, 0, 'active');

insert into public.loans (id, user_id, delivered_by, expected_return_date, status)
values (
  '84000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000006',
  '81000000-0000-0000-0000-000000000002',
  current_date - 1,
  'active'
);

insert into public.loan_items (
  loan_id, item_id, quantity, returned_quantity, damaged_quantity, missing_quantity
) values (
  '84000000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000001',
  1, 0, 0, 0
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000004","role":"authenticated"}', true);

do $test$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.generate_asset_clearance_certificate(
      '82000000-0000-0000-0000-000000000001'
    );
  exception when others then
    v_blocked := position('Cuenta inactiva o sin permisos' in sqlerrm) > 0;
  end;

  if not v_blocked then
    raise exception 'CERTIFICATE_PHASE3A_TEST_FAILED: student emitió un certificado';
  end if;

  begin
    insert into public.asset_clearance_certificate_documents (
      certificate_id, issued_by, issued_at, document_version, content_snapshot
    ) values (
      '82000000-0000-0000-0000-000000000001',
      auth.uid(),
      now(),
      'test',
      '{}'::jsonb
    );
    raise exception 'CERTIFICATE_PHASE3A_TEST_FAILED: authenticated realizó escritura directa';
  exception when insufficient_privilege then
    null;
  end;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

do $test$
declare
  v_blocked boolean := false;
begin
  begin
    perform public.generate_asset_clearance_certificate(
      '82000000-0000-0000-0000-000000000002'
    );
  exception when others then
    v_blocked := position('Cuenta inactiva o sin permisos' in sqlerrm) > 0;
  end;

  if not v_blocked then
    raise exception 'CERTIFICATE_PHASE3A_TEST_FAILED: teacher emitió un certificado';
  end if;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $test$
declare
  v_first_code text;
  v_second_code text;
  v_blocked boolean := false;
begin
  select result.certificate_code into v_first_code
  from public.generate_asset_clearance_certificate(
    '82000000-0000-0000-0000-000000000001'
  ) as result;

  select result.certificate_code into v_second_code
  from public.generate_asset_clearance_certificate(
    '82000000-0000-0000-0000-000000000001'
  ) as result;

  if v_first_code is null
    or v_first_code !~ '^LM-[0-9]{4}-[0-9]{6}$'
    or v_second_code is distinct from v_first_code then
    raise exception 'CERTIFICATE_PHASE3A_TEST_FAILED: emisión admin o idempotencia inválida';
  end if;

  if (
    select count(*)
    from public.asset_clearance_certificate_documents
    where certificate_id = '82000000-0000-0000-0000-000000000001'
  ) <> 1 then
    raise exception 'CERTIFICATE_PHASE3A_TEST_FAILED: doble emisión creó documentos duplicados';
  end if;

  begin
    perform public.generate_asset_clearance_certificate(
      '82000000-0000-0000-0000-000000000004'
    );
  exception when others then
    v_blocked := position('mantiene obligaciones' in sqlerrm) > 0;
  end;

  if not v_blocked then
    raise exception 'CERTIFICATE_PHASE3A_TEST_FAILED: se emitió con obligaciones pendientes';
  end if;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"81000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

do $test$
declare
  v_code text;
begin
  select result.certificate_code into v_code
  from public.generate_asset_clearance_certificate(
    '82000000-0000-0000-0000-000000000003'
  ) as result;

  if v_code is null then
    raise exception 'CERTIFICATE_PHASE3A_TEST_FAILED: lab_staff no pudo emitir';
  end if;
end;
$test$;

reset role;

do $test$
begin
  if not exists (
    select 1
    from public.asset_clearance_certificates as certificate
    join public.asset_clearance_certificate_documents as document
      on document.certificate_id = certificate.id
    where certificate.id = '82000000-0000-0000-0000-000000000001'
      and certificate.status = 'generated'
      and document.issued_by = '81000000-0000-0000-0000-000000000001'
      and document.content_snapshot -> 'institution' ->> 'name' = 'Universidad de Cuenca'
      and document.content_snapshot -> 'institution' ->> 'laboratory' = 'Laboratorio de Máquinas'
      and document.content_snapshot -> 'signatory' ->> 'name' = 'Ing. Francisco Sanchez'
  ) then
    raise exception 'CERTIFICATE_PHASE3A_TEST_FAILED: snapshot institucional incompleto';
  end if;

  if exists (
    select 1
    from public.asset_clearance_certificate_documents
    where certificate_id = '82000000-0000-0000-0000-000000000004'
  ) then
    raise exception 'CERTIFICATE_PHASE3A_TEST_FAILED: obligación pendiente dejó un documento';
  end if;
end;
$test$;

select pass('emisión segura, elegibilidad, permisos e idempotencia aplicados');
select * from finish();

rollback;
