create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('inpaint','export-print')),
  cost_usd numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);

alter table public.usage_events enable row level security;

create policy "usage_events_select_own"
  on public.usage_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "usage_events_insert_own"
  on public.usage_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

