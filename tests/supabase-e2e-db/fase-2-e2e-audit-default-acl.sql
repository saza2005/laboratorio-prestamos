-- Read-only query. Run only in the E2E SQL Editor.
select
  d.defaclrole::regrole as owner_role,
  case when d.defaclnamespace = 0 then null else d.defaclnamespace::regnamespace end as schema_name,
  case d.defaclobjtype
    when 'r' then 'tables'
    when 'S' then 'sequences'
    when 'f' then 'functions'
    when 'T' then 'types'
    when 'n' then 'schemas'
    else d.defaclobjtype::text
  end as object_type,
  d.defaclacl as acl,
  x.grantee::regrole as grantee,
  x.privilege_type,
  x.grantor::regrole as grantor,
  x.is_grantable
from pg_default_acl d
cross join lateral aclexplode(d.defaclacl) x
where d.defaclobjtype in ('r', 'S', 'f', 'T', 'n')
order by owner_role, schema_name, object_type, grantee, privilege_type;
