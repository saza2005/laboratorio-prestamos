-- Future objects in public must not become API-accessible implicitly.
-- Existing grants and RLS policies remain unchanged; each future migration must
-- grant only the privileges its object actually requires.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
