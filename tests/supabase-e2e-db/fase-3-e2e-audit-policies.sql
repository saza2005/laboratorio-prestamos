-- Read-only audit for Supabase E2E. Do not run against production.
select schemaname as table_schema, tablename as table_name, policyname as policy_name, permissive, array_to_string(roles, ',') as roles, cmd as command, qual as using_expression, with_check as with_check_expression from pg_policies where schemaname='public' order by tablename, policyname;
