-- Hybrid billing credits: user_credits + purchases + usage credits_used + atomic RPCs.

-- Clean up older prototypes to avoid RPC ambiguity.
drop function if exists public.consume_credits(bigint, text, text);
drop function if exists public.add_credits(uuid, bigint, text);
drop function if exists public.add_credits_with_reason(uuid, bigint, text, text);

-- 1) user_credits
create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;

drop policy if exists "users can view own credits" on public.user_credits;
create policy "users can view own credits"
  on public.user_credits
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes only via RPC / service_role.
revoke insert, update, delete on public.user_credits from anon, authenticated;

-- 2) usage_events extension for credits
alter table public.usage_events
  add column if not exists credits_used integer not null default 0;

-- Ensure job_id exists (older rows/migrations may not have it).
alter table public.usage_events
  add column if not exists job_id text;

create index if not exists idx_usage_user_date
  on public.usage_events (user_id, created_at desc);

-- 3) credit_purchases
create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null,
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);

alter table public.credit_purchases enable row level security;

-- Only service_role writes (webhook). Allow user to view own history if needed.
drop policy if exists "credit_purchases_select_own" on public.credit_purchases;
create policy "credit_purchases_select_own"
  on public.credit_purchases
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.credit_purchases from anon, authenticated;

-- 4) RPC: consume_credits (atomic + idempotent per job_id/kind when job_id provided)
create or replace function public.consume_credits(
  p_amount integer,
  p_kind text,
  p_ref text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid;
  current_balance integer;
  inserted_event_id uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return false;
  end if;

  if p_amount is null or p_amount <= 0 then
    return true;
  end if;

  -- Lock balance row.
  select balance into current_balance
  from public.user_credits
  where user_id = v_uid
  for update;

  if current_balance is null then
    insert into public.user_credits(user_id, balance)
    values (v_uid, 0)
    returning balance into current_balance;
  end if;

  if current_balance < p_amount then
    return false;
  end if;

  -- Idempotency: usage_events already enforces (job_id, kind) uniqueness in this repo.
  -- We only decrement balance if we actually inserted an event.
  insert into public.usage_events(user_id, kind, credits_used, job_id, amount)
  values (v_uid, p_kind, p_amount, nullif(p_ref, ''), p_amount)
  on conflict (job_id, kind) where job_id is not null do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null and p_ref is not null and length(p_ref) > 0 then
    -- Already charged for this (job_id, kind).
    return true;
  end if;

  update public.user_credits
  set balance = balance - p_amount,
      updated_at = now()
  where user_id = v_uid;

  return true;
end;
$$;

revoke all on function public.consume_credits(integer, text, text) from anon;
grant execute on function public.consume_credits(integer, text, text) to authenticated;

-- 5) RPC: add_credits (webhook safe, idempotent by stripe_session_id)
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_ref text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_id uuid;
begin
  if p_user_id is null then
    return;
  end if;
  if p_amount is null or p_amount <= 0 then
    return;
  end if;

  insert into public.credit_purchases(user_id, credits, stripe_session_id)
  values (p_user_id, p_amount, nullif(p_ref, ''))
  on conflict (stripe_session_id) do nothing
  returning id into purchase_id;

  if purchase_id is null and p_ref is not null and length(p_ref) > 0 then
    -- already processed this Stripe session
    return;
  end if;

  insert into public.user_credits(user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id)
  do update set
    balance = public.user_credits.balance + excluded.balance,
    updated_at = now();
end;
$$;

-- Safety: only service_role should be able to execute add_credits.
revoke all on function public.add_credits(uuid, integer, text) from anon, authenticated;
grant execute on function public.add_credits(uuid, integer, text) to service_role;

-- 6) RPC helper: daily usage for dashboard
create or replace function public.credits_usage_by_day(p_days integer default 30)
returns table(day date, total_credits bigint)
language sql
security invoker
set search_path = public
as $$
  select
    (created_at at time zone 'UTC')::date as day,
    sum(credits_used)::bigint as total_credits
  from public.usage_events
  where user_id = auth.uid()
    and created_at >= (now() at time zone 'utc')
      - ((interval '1 day') * greatest(1, least(365, coalesce(p_days, 30))))
  group by 1
  order by 1;
$$;

revoke all on function public.credits_usage_by_day(integer) from anon;
grant execute on function public.credits_usage_by_day(integer) to authenticated;

