-- Read-only catalog verification for E2E. Do not execute application RPCs.
with targets(function_signature, category) as (values
  ('public.create_loan_transaction(uuid, uuid, integer, date, text, uuid)', 'legacy'),
  ('public.create_loan_with_unit_transaction(uuid, uuid, uuid, integer, date, text, uuid)', 'legacy'),
  ('public.deliver_approved_request(uuid, uuid, text)', 'legacy'),
  ('public.deliver_approved_request_with_units(uuid, jsonb, uuid, text)', 'legacy'),
  ('public.increment_stock(uuid, integer)', 'legacy'),
  ('public.create_multi_item_loan_transaction(uuid, jsonb, date, text, uuid)', 'active'),
  ('public.deliver_approved_request_with_units(uuid, jsonb, jsonb, uuid, text)', 'active')
)
select function_signature, category,
  has_function_privilege('public', function_signature, 'execute') as public_execute,
  has_function_privilege('anon', function_signature, 'execute') as anon_execute,
  has_function_privilege('authenticated', function_signature, 'execute') as authenticated_execute,
  has_function_privilege('service_role', function_signature, 'execute') as service_role_execute
from targets
order by category, function_signature;
