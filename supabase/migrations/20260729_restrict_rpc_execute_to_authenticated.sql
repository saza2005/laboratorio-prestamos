begin;

-- Las RPC del sistema se ejecutan desde usuarios autenticados o desde triggers.
-- Se revoca anon/public para evitar que clientes sin sesion puedan invocarlas.

revoke all on function public.approve_request_transaction(uuid, jsonb) from anon;
revoke all on function public.approve_request_transaction(uuid, jsonb) from public;
grant execute on function public.approve_request_transaction(uuid, jsonb) to authenticated;

revoke all on function public.cancel_own_request_transaction(uuid) from anon;
revoke all on function public.cancel_own_request_transaction(uuid) from public;
grant execute on function public.cancel_own_request_transaction(uuid) to authenticated;

revoke all on function public.create_inventory_item_transaction(
  text,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer,
  text,
  text
) from anon;
revoke all on function public.create_inventory_item_transaction(
  text,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer,
  text,
  text
) from public;
grant execute on function public.create_inventory_item_transaction(
  text,
  text,
  text,
  text,
  text,
  boolean,
  integer,
  integer,
  text,
  text
) to authenticated;

revoke all on function public.create_multi_item_loan_transaction(
  uuid,
  jsonb,
  date,
  text,
  uuid
) from anon;
revoke all on function public.create_multi_item_loan_transaction(
  uuid,
  jsonb,
  date,
  text,
  uuid
) from public;
grant execute on function public.create_multi_item_loan_transaction(
  uuid,
  jsonb,
  date,
  text,
  uuid
) to authenticated;

revoke all on function public.create_request_transaction(
  text,
  text,
  date,
  jsonb,
  jsonb
) from anon;
revoke all on function public.create_request_transaction(
  text,
  text,
  date,
  jsonb,
  jsonb
) from public;
grant execute on function public.create_request_transaction(
  text,
  text,
  date,
  jsonb,
  jsonb
) to authenticated;

revoke all on function public.deliver_approved_request_with_units(
  uuid,
  jsonb,
  uuid,
  text
) from anon;
revoke all on function public.deliver_approved_request_with_units(
  uuid,
  jsonb,
  uuid,
  text
) from public;
grant execute on function public.deliver_approved_request_with_units(
  uuid,
  jsonb,
  uuid,
  text
) to authenticated;

revoke all on function public.deliver_approved_request_with_units(
  uuid,
  jsonb,
  jsonb,
  uuid,
  text
) from anon;
revoke all on function public.deliver_approved_request_with_units(
  uuid,
  jsonb,
  jsonb,
  uuid,
  text
) from public;
grant execute on function public.deliver_approved_request_with_units(
  uuid,
  jsonb,
  jsonb,
  uuid,
  text
) to authenticated;

revoke all on function public.ensure_google_institutional_profile() from anon;
revoke all on function public.ensure_google_institutional_profile() from public;
grant execute on function public.ensure_google_institutional_profile() to authenticated;

revoke all on function public.get_dashboard_inventory_summary() from anon;
revoke all on function public.get_dashboard_inventory_summary() from public;
grant execute on function public.get_dashboard_inventory_summary() to authenticated;

revoke all on function public.get_my_role() from anon;
revoke all on function public.get_my_role() from public;
grant execute on function public.get_my_role() to authenticated;

revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from public;

revoke all on function public.increment_stock(uuid, integer) from anon;
revoke all on function public.increment_stock(uuid, integer) from public;
grant execute on function public.increment_stock(uuid, integer) to authenticated;

revoke all on function public.is_admin_or_lab_staff() from anon;
revoke all on function public.is_admin_or_lab_staff() from public;
grant execute on function public.is_admin_or_lab_staff() to authenticated;

revoke all on function public.is_teacher() from anon;
revoke all on function public.is_teacher() from public;
grant execute on function public.is_teacher() to authenticated;

revoke all on function public.register_return_transaction(
  uuid,
  integer,
  integer,
  integer,
  text,
  uuid
) from anon;
revoke all on function public.register_return_transaction(
  uuid,
  integer,
  integer,
  integer,
  text,
  uuid
) from public;
grant execute on function public.register_return_transaction(
  uuid,
  integer,
  integer,
  integer,
  text,
  uuid
) to authenticated;

revoke all on function public.reject_request_transaction(uuid, text) from anon;
revoke all on function public.reject_request_transaction(uuid, text) from public;
grant execute on function public.reject_request_transaction(uuid, text) to authenticated;

revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from public;

commit;
