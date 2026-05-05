create or replace function public.get_usage_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  day date,
  inpaint_count int,
  export_print_count int,
  total_cost_usd numeric
)
language sql
security invoker
as $$
  select
    date_trunc('day', created_at)::date as day,
    count(*) filter (where kind = 'inpaint') as inpaint_count,
    count(*) filter (where kind = 'export-print') as export_print_count,
    coalesce(sum(cost_usd), 0) as total_cost_usd
  from public.usage_events
  where user_id = auth.uid()
    and created_at between p_from and p_to
  group by 1
  order by 1 asc;
$$;

