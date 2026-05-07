-- Billing settings + performance aggregation (materialized view).

-- 1) billing_settings (per-user)
create table if not exists public.billing_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,

  auto_topup_enabled boolean not null default false,
  auto_topup_threshold integer not null default 10,
  auto_topup_amount integer not null default 100,

  -- loop protection
  last_auto_topup_at timestamptz,
  last_auto_topup_ref text,

  alert_threshold integer not null default 20,
  email_alerts boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_settings enable row level security;

drop policy if exists "users manage own billing" on public.billing_settings;
create policy "users manage own billing"
  on public.billing_settings
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) usage_daily_agg (materialized view)
create materialized view if not exists public.usage_daily_agg as
select
  user_id,
  date_trunc('day', created_at) as day,
  sum(credits_used)::bigint as total
from public.usage_events
group by user_id, day;

create index if not exists usage_daily_agg_user_day_idx
  on public.usage_daily_agg (user_id, day desc);

-- Never expose matview directly (views/matviews don't use RLS).
revoke all on public.usage_daily_agg from anon, authenticated;

-- Refresh RPC (service_role only) so we can call from cron.
create or replace function public.refresh_usage_daily_agg()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view public.usage_daily_agg;
$$;

revoke all on function public.refresh_usage_daily_agg() from anon, authenticated;
grant execute on function public.refresh_usage_daily_agg() to service_role;

-- Read RPC (security invoker) that only returns the caller's data.
create or replace function public.get_usage_daily_agg(p_days integer default 30)
returns table(day date, total_credits bigint)
language sql
security invoker
set search_path = public
as $$
  select
    (day at time zone 'UTC')::date as day,
    total
  from public.usage_daily_agg
  where user_id = auth.uid()
    and day >= date_trunc('day', (now() at time zone 'utc'))
      - ((interval '1 day') * greatest(1, least(365, coalesce(p_days, 30))))
  order by day;
$$;

revoke all on function public.get_usage_daily_agg(integer) from anon;
grant execute on function public.get_usage_daily_agg(integer) to authenticated;

