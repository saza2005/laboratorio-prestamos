-- Prueba transaccional local de la fase 1. Todos los fixtures se revierten.
begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin.certificate-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'staff.certificate-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'teacher.certificate-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'student.certificate-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'debtor.certificate-test@ucuenca.edu.ec', now(), '{"provider":"google"}', '{}', now(), now());

insert into public.profiles (id, full_name, email, role, is_active) values
  ('71000000-0000-0000-0000-000000000001', 'Certificate Admin', 'admin.certificate-test@ucuenca.edu.ec', 'admin', true),
  ('71000000-0000-0000-0000-000000000002', 'Certificate Staff', 'staff.certificate-test@ucuenca.edu.ec', 'lab_staff', true),
  ('71000000-0000-0000-0000-000000000003', 'Certificate Teacher', 'teacher.certificate-test@ucuenca.edu.ec', 'teacher', true),
  ('71000000-0000-0000-0000-000000000004', 'Certificate Student', 'student.certificate-test@ucuenca.edu.ec', 'student', true),
  ('71000000-0000-0000-0000-000000000005', 'Certificate Debtor', 'debtor.certificate-test@ucuenca.edu.ec', 'student', true);

insert into public.items (id, code, name, item_type, stock_total, stock_available, status)
values ('72000000-0000-0000-0000-000000000001', 'CERT-ITEM', 'Certificate test item', 'equipment', 1, 0, 'active');

insert into public.loans (id, user_id, delivered_by, expected_return_date, status)
values (
  '73000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000005',
  '71000000-0000-0000-0000-000000000002',
  current_date - 1,
  'active'
);

insert into public.loan_items (loan_id, item_id, quantity, returned_quantity, damaged_quantity, missing_quantity)
values ('73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 1, 0, 0, 0);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000004","role":"authenticated"}', true);

do $test$
declare
  v_certificate_id uuid;
  v_blocked boolean := false;
begin
  begin
    insert into public.asset_clearance_certificates (applicant_id, evaluation_snapshot)
    values (auth.uid(), '{"eligible":true}'::jsonb);
  exception when insufficient_privilege then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'CERTIFICATE_TEST_FAILED: student realizó inserción directa';
  end if;

  v_blocked := false;
  v_certificate_id := public.request_asset_clearance_certificate();

  if v_certificate_id is null then
    raise exception 'CERTIFICATE_TEST_FAILED: student no creó solicitud';
  end if;

  begin
    perform public.review_asset_clearance_certificate(v_certificate_id, 'approved');
  exception when others then
    v_blocked := position('Cuenta inactiva o sin permisos' in sqlerrm) > 0;
  end;

  if not v_blocked then
    raise exception 'CERTIFICATE_TEST_FAILED: student revisó su propia solicitud';
  end if;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select public.request_asset_clearance_certificate();

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

do $test$
declare
  v_teacher_certificate_id uuid;
begin
  select id into v_teacher_certificate_id
  from public.asset_clearance_certificates
  where applicant_id = '71000000-0000-0000-0000-000000000003';

  perform public.review_asset_clearance_certificate(
    v_teacher_certificate_id,
    'rejected',
    null,
    'Solicitud rechazada durante prueba transaccional'
  );
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select public.request_asset_clearance_certificate();

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $test$
declare
  v_clear_certificate_id uuid;
  v_debtor_certificate_id uuid;
  v_blocked boolean := false;
begin
  select id into v_clear_certificate_id
  from public.asset_clearance_certificates
  where applicant_id = '71000000-0000-0000-0000-000000000004';

  perform public.review_asset_clearance_certificate(v_clear_certificate_id, 'approved', 'Sin obligaciones');

  select id into v_debtor_certificate_id
  from public.asset_clearance_certificates
  where applicant_id = '71000000-0000-0000-0000-000000000005';

  begin
    perform public.review_asset_clearance_certificate(v_debtor_certificate_id, 'approved');
  exception when others then
    v_blocked := position('mantiene obligaciones' in sqlerrm) > 0;
  end;

  if not v_blocked then
    raise exception 'CERTIFICATE_TEST_FAILED: se aprobó solicitante con préstamo vencido y pendiente';
  end if;

  perform public.review_asset_clearance_certificate(
    v_debtor_certificate_id,
    'rejected',
    'Revisión manual completada',
    'Mantiene bienes pendientes'
  );
end;
$test$;

reset role;

do $test$
declare
  v_snapshot jsonb;
begin
  if not exists (
    select 1 from public.asset_clearance_certificates
    where applicant_id = '71000000-0000-0000-0000-000000000004'
      and status = 'approved'
      and reviewed_by = '71000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'CERTIFICATE_TEST_FAILED: aprobación válida no persistió';
  end if;

  if not exists (
    select 1 from public.asset_clearance_certificates
    where applicant_id = '71000000-0000-0000-0000-000000000005'
      and status = 'rejected'
      and (evaluation_snapshot ->> 'eligible')::boolean is false
  ) then
    raise exception 'CERTIFICATE_TEST_FAILED: rechazo o snapshot no persistió';
  end if;

  update public.loans
  set status = 'returned', returned_at = now()
  where id = '73000000-0000-0000-0000-000000000001';
  update public.loan_items
  set returned_quantity = 1, damaged_quantity = 1, missing_quantity = 0
  where loan_id = '73000000-0000-0000-0000-000000000001';

  v_snapshot := public.evaluate_asset_clearance_eligibility_20260922(
    '71000000-0000-0000-0000-000000000005'
  );
  if (v_snapshot ->> 'eligible')::boolean is not false
    or (v_snapshot -> 'blockers' ->> 'damaged_units')::integer <> 1 then
    raise exception 'CERTIFICATE_TEST_FAILED: daño registrado no bloqueó elegibilidad';
  end if;

  update public.loan_items
  set returned_quantity = 0, damaged_quantity = 0, missing_quantity = 1
  where loan_id = '73000000-0000-0000-0000-000000000001';

  v_snapshot := public.evaluate_asset_clearance_eligibility_20260922(
    '71000000-0000-0000-0000-000000000005'
  );
  if (v_snapshot ->> 'eligible')::boolean is not false
    or (v_snapshot -> 'blockers' ->> 'missing_units')::integer <> 1 then
    raise exception 'CERTIFICATE_TEST_FAILED: pérdida registrada no bloqueó elegibilidad';
  end if;

  update public.loans
  set status = 'partial_return', returned_at = null, expected_return_date = current_date + 1
  where id = '73000000-0000-0000-0000-000000000001';
  update public.loan_items
  set returned_quantity = 0, damaged_quantity = 0, missing_quantity = 0
  where loan_id = '73000000-0000-0000-0000-000000000001';

  v_snapshot := public.evaluate_asset_clearance_eligibility_20260922(
    '71000000-0000-0000-0000-000000000005'
  );
  if (v_snapshot -> 'blockers' ->> 'partial_returns')::integer <> 1
    or (v_snapshot -> 'blockers' ->> 'pending_items')::integer <> 1 then
    raise exception 'CERTIFICATE_TEST_FAILED: devolución parcial o bien pendiente no bloqueó elegibilidad';
  end if;
end;
$test$;

set local role anon;
do $test$
declare
  v_blocked boolean := false;
begin
  begin
    perform count(*) from public.asset_clearance_certificates;
  exception when insufficient_privilege then
    v_blocked := true;
  end;

  if not v_blocked then
    raise exception 'CERTIFICATE_TEST_FAILED: anon consultó certificados';
  end if;
end;
$test$;

reset role;

select pass('solicitud, permisos, elegibilidad y revisión de certificados aplicados');
select * from finish();

rollback;
