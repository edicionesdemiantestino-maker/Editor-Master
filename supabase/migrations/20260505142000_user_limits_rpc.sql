create or replace function public.get_user_limits()
returns table (
  inpaint_limit int,
  export_print_limit int,
  plan_id text
)
language sql
security invoker
as $$
  with active_sub as (
    select plan_id
    from public.user_subscriptions
    where user_id = auth.uid()
      and status = 'active'
      and current_period_end > now()
    limit 1
  )
  select
    bp.inpaint_limit,
    bp.export_print_limit,
    bp.id
  from public.billing_plans bp
  where bp.id = coalesce((select plan_id from active_sub), 'free')
  limit 1;
$$;

