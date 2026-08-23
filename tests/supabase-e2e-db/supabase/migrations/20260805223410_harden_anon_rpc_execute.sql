-- Remove unnecessary anonymous execution from mutational SECURITY DEFINER RPCs.
-- authenticated and service_role retain the permissions present in the baseline ACL.

revoke execute on function
  public.register_full_return_transaction(uuid, text, uuid)
from public;

revoke execute on function
  public.register_full_return_transaction(uuid, text, uuid)
from anon;

grant execute on function
  public.register_full_return_transaction(uuid, text, uuid)
to authenticated;

revoke execute on function
  public.register_maintenance_record_transaction(
    uuid,
    uuid,
    text,
    text,
    date,
    text,
    text,
    boolean
  )
from public;

revoke execute on function
  public.register_maintenance_record_transaction(
    uuid,
    uuid,
    text,
    text,
    date,
    text,
    text,
    boolean
  )
from anon;

grant execute on function
  public.register_maintenance_record_transaction(
    uuid,
    uuid,
    text,
    text,
    date,
    text,
    text,
    boolean
  )
to authenticated;

revoke execute on function
  public.update_item_unit_status_transaction(uuid, text, text)
from public;

revoke execute on function
  public.update_item_unit_status_transaction(uuid, text, text)
from anon;

grant execute on function
  public.update_item_unit_status_transaction(uuid, text, text)
to authenticated;
