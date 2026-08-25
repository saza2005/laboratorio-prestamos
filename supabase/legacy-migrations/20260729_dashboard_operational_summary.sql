begin;

create or replace function public.get_dashboard_operational_summary(
  p_start_date date,
  p_end_date date,
  p_current_date date,
  p_upcoming_limit_date date
)
returns table (
  total_items bigint,
  total_stock bigint,
  total_available bigint,
  active_loans bigint,
  partial_loans bigint,
  overdue_loans bigint,
  returned_loans bigint,
  pending_requests bigint,
  approved_requests bigint,
  out_of_stock_items bigint,
  critical_stock_items bigint,
  maintenance_data jsonb
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin_or_lab_staff() then
    raise exception 'No autorizado';
  end if;

  return query
  with inventory as (
    select
      count(*)::bigint as total_items,
      coalesce(sum(stock_total), 0)::bigint as total_stock,
      coalesce(sum(stock_available), 0)::bigint as total_available,
      count(*) filter (where stock_available = 0)::bigint as out_of_stock_items,
      count(*) filter (where stock_available > 0 and stock_available <= 2)::bigint as critical_stock_items
    from public.items
    where status::text = 'active'
  ),
  loan_counts as (
    select
      count(*) filter (
        where status = 'active'
          and (expected_return_date is null or expected_return_date >= p_current_date)
      )::bigint as active_loans,
      count(*) filter (
        where status = 'partial_return'
          and (expected_return_date is null or expected_return_date >= p_current_date)
      )::bigint as partial_loans,
      count(*) filter (
        where status in ('active', 'partial_return', 'overdue')
          and expected_return_date < p_current_date
      )::bigint as overdue_loans,
      count(*) filter (where status = 'returned')::bigint as returned_loans
    from public.loans
  ),
  request_counts as (
    select
      count(*) filter (where status = 'pending')::bigint as pending_requests,
      count(*) filter (where status = 'approved')::bigint as approved_requests
    from public.requests
  ),
  maintenance_counts as (
    select coalesce(
      jsonb_agg(jsonb_build_object('name', name, 'value', value) order by name),
      '[]'::jsonb
    ) as maintenance_data
    from (
      select
        case
          when maintenance_type = 'preventive' then 'Preventivo'
          when maintenance_type = 'corrective' then 'Correctivo'
          else 'Trabajo general'
        end as name,
        count(*)::bigint as value
      from public.maintenance_records
      where maintenance_date >= p_start_date
        and maintenance_date < p_end_date
      group by 1
    ) grouped
  )
  select
    inventory.total_items,
    inventory.total_stock,
    inventory.total_available,
    loan_counts.active_loans,
    loan_counts.partial_loans,
    loan_counts.overdue_loans,
    loan_counts.returned_loans,
    request_counts.pending_requests,
    request_counts.approved_requests,
    inventory.out_of_stock_items,
    inventory.critical_stock_items,
    maintenance_counts.maintenance_data
  from inventory
  cross join loan_counts
  cross join request_counts
  cross join maintenance_counts;
end;
$$;

revoke all on function public.get_dashboard_operational_summary(date, date, date, date) from anon;
revoke all on function public.get_dashboard_operational_summary(date, date, date, date) from public;
grant execute on function public.get_dashboard_operational_summary(date, date, date, date) to authenticated;

commit;
