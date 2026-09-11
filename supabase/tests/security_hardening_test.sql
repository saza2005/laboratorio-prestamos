-- Prueba transaccional local. Usa identidades ficticias y siempre revierte.
begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated',
  email, now(), '{"provider":"google","providers":["google"]}', '{}', now(), now()
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'admin.security-test@ucuenca.edu.ec'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'staff.security-test@ucuenca.edu.ec'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'teacher.security-test@ucuenca.edu.ec'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'student.security-test@ucuenca.edu.ec'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'new.security-test@ucuenca.edu.ec'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'target.security-test@ucuenca.edu.ec'),
  ('10000000-0000-0000-0000-000000000007'::uuid, 'external.security-test@example.com'),
  ('10000000-0000-0000-0000-000000000008'::uuid, 'password.security-test@ucuenca.edu.ec')
) as fixture(id, email);

insert into public.profiles (id, full_name, email, role, is_active) values
  ('10000000-0000-0000-0000-000000000001', 'Inactive Admin', 'admin.security-test@ucuenca.edu.ec', 'admin', false),
  ('10000000-0000-0000-0000-000000000002', 'Inactive Staff', 'staff.security-test@ucuenca.edu.ec', 'lab_staff', false),
  ('10000000-0000-0000-0000-000000000003', 'Inactive Teacher', 'teacher.security-test@ucuenca.edu.ec', 'teacher', false),
  ('10000000-0000-0000-0000-000000000004', 'Inactive Student', 'student.security-test@ucuenca.edu.ec', 'student', false),
  ('10000000-0000-0000-0000-000000000006', 'Role Target', 'target.security-test@ucuenca.edu.ec', 'student', true);

insert into public.items (id, code, name, item_type, stock_total, stock_available, status)
values ('20000000-0000-0000-0000-000000000001', 'SEC-TEST-ITEM', 'Security Test Item', 'equipment', 1, 1, 'active');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000007","email":"external.security-test@example.com","role":"authenticated","app_metadata":{"provider":"google"}}', true);
do $test$
declare blocked boolean := false;
begin
  begin perform public.ensure_google_institutional_profile();
  exception when others then blocked := position('correos institucionales' in sqlerrm) > 0; end;
  if not blocked then raise exception 'SECURITY_TEST_FAILED: correo externo creó perfil'; end if;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000008","email":"password.security-test@ucuenca.edu.ec","role":"authenticated","app_metadata":{"provider":"email"}}', true);
do $test$
declare blocked boolean := false;
begin
  begin perform public.ensure_google_institutional_profile();
  exception when others then blocked := position('Google OAuth' in sqlerrm) > 0; end;
  if not blocked then raise exception 'SECURITY_TEST_FAILED: sesión no Google creó perfil'; end if;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","email":"new.security-test@ucuenca.edu.ec","role":"authenticated","app_metadata":{"provider":"google"},"user_metadata":{"full_name":"New Security Test"}}', true);
select public.ensure_google_institutional_profile();

reset role;
do $test$
begin
  if not exists (select 1 from public.profiles where id = '10000000-0000-0000-0000-000000000005' and role = 'student' and is_active) then
    raise exception 'SECURITY_TEST_FAILED: alta OAuth no creó student activo';
  end if;
end;
$test$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","email":"new.security-test@ucuenca.edu.ec","role":"authenticated","app_metadata":{"provider":"google"}}', true);
do $test$
declare
  blocked boolean := false;
  candidate_role text;
begin
  foreach candidate_role in array array['admin', 'lab_staff', 'teacher'] loop
    blocked := false;
    begin
      execute format(
        'insert into public.profiles (id, full_name, email, role, is_active) values (%L, %L, %L, %L, true)',
        '90000000-0000-0000-0000-000000000001',
        'Privilege attempt',
        candidate_role || '.attempt@ucuenca.edu.ec',
        candidate_role
      );
    exception when insufficient_privilege then blocked := true;
    end;
    if not blocked then raise exception 'SECURITY_TEST_FAILED: inserción directa de % permitida', candidate_role; end if;
  end loop;

  blocked := false;
  begin
    update public.profiles set role = 'admin', is_active = false where id = auth.uid();
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'SECURITY_TEST_FAILED: modificación directa de profile permitida'; end if;
end;
$test$;

do $test$
begin
  if (select count(*) from public.items) <> 1 then raise exception 'SECURITY_TEST_FAILED: student activo sin lectura de inventario'; end if;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","email":"student.security-test@ucuenca.edu.ec","role":"authenticated","app_metadata":{"provider":"google"}}', true);
do $test$
declare blocked boolean := false;
begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'SECURITY_TEST_FAILED: lectura mínima de perfil incorrecta'; end if;
  if (select count(*) from public.items) <> 0 then raise exception 'SECURITY_TEST_FAILED: inactivo leyó inventario'; end if;
  begin
    perform public.create_request_transaction('Security test', null, current_date + 1, '[]', '[]');
  exception when others then blocked := position('Cuenta inactiva' in sqlerrm) > 0;
  end;
  if not blocked then raise exception 'SECURITY_TEST_FAILED: student inactivo alcanzó RPC'; end if;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","email":"teacher.security-test@ucuenca.edu.ec","role":"authenticated","app_metadata":{"provider":"google"}}', true);
do $test$
declare blocked boolean := false;
begin
  begin perform public.create_request_transaction('Security test', null, current_date + 1, '[]', '[]');
  exception when others then blocked := position('Cuenta inactiva' in sqlerrm) > 0; end;
  if not blocked then raise exception 'SECURITY_TEST_FAILED: teacher inactivo alcanzó RPC'; end if;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","email":"staff.security-test@ucuenca.edu.ec","role":"authenticated","app_metadata":{"provider":"google"}}', true);
do $test$
declare blocked boolean := false;
begin
  begin perform public.approve_request_transaction('30000000-0000-0000-0000-000000000001', '[]');
  exception when others then blocked := position('Cuenta inactiva' in sqlerrm) > 0; end;
  if not blocked then raise exception 'SECURITY_TEST_FAILED: lab_staff inactivo alcanzó RPC'; end if;
end;
$test$;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","email":"admin.security-test@ucuenca.edu.ec","role":"authenticated","app_metadata":{"provider":"google"}}', true);
do $test$
declare blocked boolean := false;
begin
  begin perform public.update_profile_role('10000000-0000-0000-0000-000000000006', 'teacher');
  exception when others then blocked := position('No autorizado' in sqlerrm) > 0; end;
  if not blocked then raise exception 'SECURITY_TEST_FAILED: admin inactivo alcanzó RPC'; end if;
end;
$test$;

reset role;
update public.profiles set is_active = true where id = '10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","email":"admin.security-test@ucuenca.edu.ec","role":"authenticated","app_metadata":{"provider":"google"}}', true);
select public.update_profile_role('10000000-0000-0000-0000-000000000006', 'teacher');

reset role;
do $test$
begin
  if not exists (select 1 from public.profiles where id = '10000000-0000-0000-0000-000000000006' and role = 'teacher') then
    raise exception 'SECURITY_TEST_FAILED: admin activo no pudo cambiar rol';
  end if;
end;
$test$;

set local role anon;
do $test$
declare blocked boolean := false;
begin
  begin perform count(*) from public.items;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'SECURITY_TEST_FAILED: anon leyó inventario'; end if;
end;
$test$;

select pass('controles de profiles, is_active, RPC y RLS aplicados');
select * from finish();

rollback;
