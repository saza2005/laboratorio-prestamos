-- Remove unnecessary anonymous execution from the 21 functions currently exposed in E2E.
-- authenticated and service_role permissions are intentionally preserved.
-- The default ACL prevents anonymous execution on future public functions.
-- Table grants are intentionally deferred for separate functional review.
-- Remove anonymous access from functions currently granted to anon in E2E.
-- No authenticated or service_role permissions are changed.

revoke execute on function public.approve_request_transaction(uuid, jsonb) from public;
revoke execute on function public.approve_request_transaction(uuid, jsonb) from anon;
revoke execute on function public.cancel_own_request_transaction(uuid) from public;
revoke execute on function public.cancel_own_request_transaction(uuid) from anon;
revoke execute on function public.create_inventory_item_transaction(text, text, text, text, text, boolean, integer, integer, text, text) from public;
revoke execute on function public.create_inventory_item_transaction(text, text, text, text, text, boolean, integer, integer, text, text) from anon;
revoke execute on function public.create_loan_transaction(uuid, uuid, integer, date, text, uuid) from public;
revoke execute on function public.create_loan_transaction(uuid, uuid, integer, date, text, uuid) from anon;
revoke execute on function public.create_loan_with_unit_transaction(uuid, uuid, uuid, integer, date, text, uuid) from public;
revoke execute on function public.create_loan_with_unit_transaction(uuid, uuid, uuid, integer, date, text, uuid) from anon;
revoke execute on function public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid) from public;
revoke execute on function public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid) from anon;
revoke execute on function public.create_request_transaction(text, text, date, jsonb, jsonb) from public;
revoke execute on function public.create_request_transaction(text, text, date, jsonb, jsonb) from anon;
revoke execute on function public.deliver_approved_request(uuid, uuid, text) from public;
revoke execute on function public.deliver_approved_request(uuid, uuid, text) from anon;
revoke execute on function public.deliver_approved_request_with_units(uuid, jsonb, jsonb, uuid, text) from public;
revoke execute on function public.deliver_approved_request_with_units(uuid, jsonb, jsonb, uuid, text) from anon;
revoke execute on function public.deliver_approved_request_with_units(uuid, jsonb, uuid, text) from public;
revoke execute on function public.deliver_approved_request_with_units(uuid, jsonb, uuid, text) from anon;
revoke execute on function public.ensure_google_institutional_profile() from public;
revoke execute on function public.ensure_google_institutional_profile() from anon;
revoke execute on function public.get_dashboard_inventory_summary() from public;
revoke execute on function public.get_dashboard_inventory_summary() from anon;
revoke execute on function public.get_dashboard_operational_summary(date, date, date, date) from public;
revoke execute on function public.get_dashboard_operational_summary(date, date, date, date) from anon;
revoke execute on function public.get_my_role() from public;
revoke execute on function public.get_my_role() from anon;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.increment_stock(uuid, integer) from public;
revoke execute on function public.increment_stock(uuid, integer) from anon;
revoke execute on function public.is_admin_or_lab_staff() from public;
revoke execute on function public.is_admin_or_lab_staff() from anon;
revoke execute on function public.is_teacher() from public;
revoke execute on function public.is_teacher() from anon;
revoke execute on function public.register_return_transaction(uuid, integer, integer, integer, text, uuid) from public;
revoke execute on function public.register_return_transaction(uuid, integer, integer, integer, text, uuid) from anon;
revoke execute on function public.reject_request_transaction(uuid, text) from public;
revoke execute on function public.reject_request_transaction(uuid, text) from anon;
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon;

-- The public default ACL grants EXECUTE on future functions to anon in both local and E2E.
-- This affects future functions only; it does not revoke existing object privileges.
alter default privileges for role supabase_admin in schema public
revoke execute on functions from anon;
