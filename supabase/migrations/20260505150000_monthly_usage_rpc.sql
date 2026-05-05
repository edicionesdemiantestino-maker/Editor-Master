create or replace function public.get_monthly_usage(uid uuid)
returns table (
  kind text,
  total_quantity int,
  total_cost numeric
)
language sql
security invoker
as $$
  select
    kind,
    coalesce(sum(cost_units), 0)::int as total_quantity,
    coalesce(sum(cost_usd), 0) as total_cost
  from public.usage_events
  where user_id = auth.uid()
    and auth.uid() = uid
    and created_at >= date_trunc('month', now())
  group by kind
  order by kind;
$$;

