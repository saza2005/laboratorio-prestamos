-- Read-only query. Run only in the E2E SQL Editor.
-- MAINTAIN is returned when PostgreSQL supports that privilege.
with roles(role_name) as (
  values ('anon'::name), ('authenticated'::name), ('service_role'::name)
), tables as (
  select c.oid, n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
)
select
  t.nspname as schema_name,
  t.relname as table_name,
  r.role_name,
  has_table_privilege(r.role_name, t.oid, 'SELECT') as select_privilege,
  has_table_privilege(r.role_name, t.oid, 'INSERT') as insert_privilege,
  has_table_privilege(r.role_name, t.oid, 'UPDATE') as update_privilege,
  has_table_privilege(r.role_name, t.oid, 'DELETE') as delete_privilege,
  has_table_privilege(r.role_name, t.oid, 'TRUNCATE') as truncate_privilege,
  has_table_privilege(r.role_name, t.oid, 'REFERENCES') as references_privilege,
  has_table_privilege(r.role_name, t.oid, 'TRIGGER') as trigger_privilege,
  case
    when current_setting('server_version_num')::integer >= 160000
      then has_table_privilege(r.role_name, t.oid, 'MAINTAIN')
    else null::boolean
  end as maintain_privilege,
  t.relrowsecurity as rls_enabled,
  t.relforcerowsecurity as rls_forced,
  (select count(*) from pg_policies p where p.schemaname = t.nspname and p.tablename = t.relname) as policy_count
from tables t
cross join roles r
order by t.relname, r.role_name;
