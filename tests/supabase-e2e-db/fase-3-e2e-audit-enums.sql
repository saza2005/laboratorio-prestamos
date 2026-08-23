-- Read-only audit for Supabase E2E. Do not run against production.
select ns.nspname as enum_schema, typ.typname as enum_name, enum.enumlabel as enum_value, enum.enumsortorder as sort_order from pg_type typ join pg_namespace ns on ns.oid=typ.typnamespace join pg_enum enum on enum.enumtypid=typ.oid where ns.nspname='public' order by typ.typname, enum.enumsortorder;
