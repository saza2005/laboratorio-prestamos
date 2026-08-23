-- Revoke authenticated EXECUTE from legacy RPCs no longer used by active flows.
-- PUBLIC and anon were hardened by previous migrations; service_role is preserved.
-- Functions remain available for historical compatibility and are not dropped.

revoke execute on function
  public.create_loan_transaction(uuid, uuid, integer, date, text, uuid)
from authenticated;

revoke execute on function
  public.create_loan_with_unit_transaction(uuid, uuid, uuid, integer, date, text, uuid)
from authenticated;

revoke execute on function
  public.deliver_approved_request(uuid, uuid, text)
from authenticated;

revoke execute on function
  public.deliver_approved_request_with_units(uuid, jsonb, uuid, text)
from authenticated;

revoke execute on function
  public.increment_stock(uuid, integer)
from authenticated;

