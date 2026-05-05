create or replace function public.get_usage_today(p_kind text)
returns int
language sql
security invoker
as $$
  select coalesce(sum(cost_units), 0)::int
  from public.usage_events
  where user_id = auth.uid()
    and kind = p_kind
    and created_at >= date_trunc('day', now());
$$;

