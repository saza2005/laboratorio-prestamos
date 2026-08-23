-- Read-only audit queries for the linked E2E project.
-- Do not execute through a migration or application action.

-- Effective table privileges, RLS and policies.
select
  n.nspname as schema_name,
  c.relname as table_name,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
  has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
  has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
  has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_delete,
  has_table_privilege('service_role', c.oid, 'SELECT') as service_role_select,
  has_table_privilege('service_role', c.oid, 'INSERT') as service_role_insert,
  has_table_privilege('service_role', c.oid, 'UPDATE') as service_role_update,
  has_table_privilege('service_role', c.oid, 'DELETE') as service_role_delete,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls,
  coalesce(array_to_string(c.relacl, '; '), '(default)') as acl
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Effective function privileges and security properties.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as return_type,
  r.rolname as owner,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, '; '), '(none)') as configuration,
  coalesce(array_to_string(p.proacl, '; '), '(default)') as acl,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and p.prokind = 'f'
order by p.proname, p.oid;

-- Default privileges for the postgres owner in public.
select
  defaclrole::regrole as owner_role,
  defaclnamespace::regnamespace as schema_name,
  defaclobjtype as object_type,
  coalesce(array_to_string(defaclacl, '; '), '(none)') as default_acl
from pg_default_acl
where defaclrole = 'postgres'::regrole
  and (defaclnamespace = 'public'::regnamespace or defaclnamespace = 0)
order by defaclobjtype;
