-- Read-only verification for the E2E project. Do not run against production.
select
  n.nspname as schema_name,
  p.proname as function_name,
  format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as function_signature,
  p.prosecdef as security_definer,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
  r.rolname as owner,
  coalesce(array_to_string(p.proconfig, '; '), '(none)') as configuration,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and p.prokind = 'f'
order by p.proname, p.oid;
