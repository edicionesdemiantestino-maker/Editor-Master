create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.billing_plans(id),

  status text not null default 'active', -- active | canceled | past_due
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_user_idx
  on public.user_subscriptions(user_id);

alter table public.user_subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.user_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_user_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_subscriptions_set_updated_at on public.user_subscriptions;

create trigger user_subscriptions_set_updated_at
  before update on public.user_subscriptions
  for each row
  execute function public.set_user_subscriptions_updated_at();

