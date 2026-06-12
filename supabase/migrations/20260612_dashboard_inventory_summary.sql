-- Resume el inventario visible según las políticas RLS del usuario actual.

create or replace function public.get_dashboard_inventory_summary()
returns table (
  total_items bigint,
  total_stock bigint,
  total_available bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    count(*)::bigint,
    coalesce(sum(stock_total), 0)::bigint,
    coalesce(sum(stock_available), 0)::bigint
  from public.items
  where status::text = 'active';
$$;

revoke all on function public.get_dashboard_inventory_summary() from public;
grant execute on function public.get_dashboard_inventory_summary()
to authenticated;
