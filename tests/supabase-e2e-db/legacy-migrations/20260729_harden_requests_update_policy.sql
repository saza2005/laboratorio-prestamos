begin;

drop policy if exists requests_update_own_or_staff on public.requests;

create policy requests_update_staff
on public.requests
for update
to authenticated
using (public.is_admin_or_lab_staff())
with check (public.is_admin_or_lab_staff());

commit;
