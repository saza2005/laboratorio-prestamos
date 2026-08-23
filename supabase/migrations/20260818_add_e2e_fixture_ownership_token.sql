alter table public.requests
  add column e2e_fixture_token uuid;

create unique index requests_e2e_fixture_token_unique
  on public.requests (e2e_fixture_token)
  where e2e_fixture_token is not null;

revoke all privileges
  on table public.requests
  from anon, authenticated;

grant select (
  id,
  user_id,
  requested_at,
  status,
  purpose,
  comments,
  scheduled_return_date,
  approved_by,
  approved_at,
  rejection_reason,
  created_at,
  updated_at
)
on table public.requests
to anon, authenticated;
