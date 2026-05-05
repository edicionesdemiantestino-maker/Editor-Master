-- Metered billing mapping + cursor table.

alter table public.billing_plans
  add column if not exists stripe_metered_price_id text;

alter table public.user_subscriptions
  add column if not exists stripe_metered_item_id text;

create index if not exists billing_plans_stripe_metered_price_idx
  on public.billing_plans (stripe_metered_price_id);

create table if not exists public.usage_billing_cursor (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('inpaint','export-print')),
  period_start timestamptz not null,
  last_reported_billable_units int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, period_start)
);

alter table public.usage_billing_cursor enable row level security;

create policy "usage_billing_cursor_select_own"
  on public.usage_billing_cursor
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "usage_billing_cursor_insert_own"
  on public.usage_billing_cursor
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "usage_billing_cursor_update_own"
  on public.usage_billing_cursor
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

