create or replace function public.get_usage_timeseries(days integer default 30)
returns table (
  day date,
  inpaint_used int,
  export_print_used int,
  inpaint_limit int,
  export_print_limit int,
  total_cost_usd numeric
)
language sql
security invoker
as $$
  with args as (
    select greatest(1, days)::int as days
  ),
  limits as (
    select * from public.get_user_limits()
  ),
  days_series as (
    select generate_series(
      current_date - ((select days from args) - 1),
      current_date,
      interval '1 day'
    )::date as day
  ),
  agg as (
    select
      date_trunc('day', created_at)::date as day,
      kind,
      sum(cost_units)::int as used,
      coalesce(sum(cost_usd), 0) as cost
    from public.usage_events
    where user_id = auth.uid()
      and created_at >= now() - make_interval(days => (select days from args))
    group by day, kind
  )
  select
    d.day,
    coalesce(sum(a.used) filter (where a.kind = 'inpaint'), 0) as inpaint_used,
    coalesce(sum(a.used) filter (where a.kind = 'export-print'), 0) as export_print_used,
    (select inpaint_limit from limits) as inpaint_limit,
    (select export_print_limit from limits) as export_print_limit,
    coalesce(sum(a.cost), 0) as total_cost_usd
  from days_series d
  left join agg a on a.day = d.day
  group by d.day
  order by d.day;
$$;

