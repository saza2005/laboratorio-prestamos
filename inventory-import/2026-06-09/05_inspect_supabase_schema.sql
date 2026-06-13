-- Ejecutar en Supabase SQL Editor y copiar el único resultado JSON.
-- Solo consulta metadatos; no modifica tablas, funciones ni datos.

with relevant_tables(table_name) as (
  values
    ('items'),
    ('item_units'),
    ('inventory_movements'),
    ('maintenance_records'),
    ('requests'),
    ('request_items'),
    ('request_groups'),
    ('request_group_items'),
    ('loans'),
    ('loan_items'),
    ('loan_groups'),
    ('loan_group_items'),
    ('returns'),
    ('return_items'),
    ('profiles')
),
columns_info as (
  select
    c.table_name,
    jsonb_agg(
      jsonb_build_object(
        'column', c.column_name,
        'type', c.data_type,
        'udt', c.udt_name,
        'nullable', c.is_nullable,
        'default', c.column_default
      ) order by c.ordinal_position
    ) as columns
  from information_schema.columns c
  join relevant_tables rt on rt.table_name = c.table_name
  where c.table_schema = 'public'
  group by c.table_name
),
foreign_keys as (
  select jsonb_agg(
    jsonb_build_object(
      'constraint', tc.constraint_name,
      'from_table', tc.table_name,
      'from_column', kcu.column_name,
      'to_table', ccu.table_name,
      'to_column', ccu.column_name,
      'delete_rule', rc.delete_rule
    ) order by tc.table_name, tc.constraint_name, kcu.ordinal_position
  ) as value
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_schema = tc.constraint_schema
   and kcu.constraint_name = tc.constraint_name
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_schema = tc.constraint_schema
   and ccu.constraint_name = tc.constraint_name
  join information_schema.referential_constraints rc
    on rc.constraint_schema = tc.constraint_schema
   and rc.constraint_name = tc.constraint_name
  where tc.table_schema = 'public'
    and tc.constraint_type = 'FOREIGN KEY'
    and (
      tc.table_name in (select table_name from relevant_tables)
      or ccu.table_name in (select table_name from relevant_tables)
    )
),
constraints_info as (
  select jsonb_agg(
    jsonb_build_object(
      'table', con.conrelid::regclass::text,
      'name', con.conname,
      'type', con.contype,
      'definition', pg_get_constraintdef(con.oid)
    ) order by con.conrelid::regclass::text, con.conname
  ) as value
  from pg_constraint con
  join pg_class cls on cls.oid = con.conrelid
  join pg_namespace ns on ns.oid = cls.relnamespace
  where ns.nspname = 'public'
    and cls.relname in (select table_name from relevant_tables)
),
functions_info as (
  select jsonb_agg(
    jsonb_build_object(
      'name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'result', pg_get_function_result(p.oid),
      'definition', pg_get_functiondef(p.oid)
    ) order by p.proname
  ) as value
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('create_loan_transaction', 'deliver_approved_request')
)
select jsonb_pretty(
  jsonb_build_object(
    'tables', coalesce(
      (select jsonb_object_agg(table_name, columns) from columns_info),
      '{}'::jsonb
    ),
    'foreign_keys', coalesce((select value from foreign_keys), '[]'::jsonb),
    'constraints', coalesce((select value from constraints_info), '[]'::jsonb),
    'missing_rpc_definitions', coalesce((select value from functions_info), '[]'::jsonb)
  )
) as schema_snapshot;
