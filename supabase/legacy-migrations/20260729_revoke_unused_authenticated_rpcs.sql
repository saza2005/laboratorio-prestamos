begin;

-- RPC legacy no usadas por el codigo actual. Se conservan para compatibilidad
-- historica, pero no deben estar disponibles para clientes autenticados.

revoke all on function public.deliver_approved_request_with_units(
  uuid,
  jsonb,
  uuid,
  text
) from authenticated;
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

revoke all on function public.increment_stock(uuid, integer) from authenticated;
revoke all on function public.increment_stock(uuid, integer) from anon;
revoke all on function public.increment_stock(uuid, integer) from public;

commit;
