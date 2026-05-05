-- Cuotas diarias por usuario para APIs costosas (inpaint / export-print).

create table if not exists public.user_quotas_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  inpaint_count integer not null default 0,
  export_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.user_quotas_daily enable row level security;

create policy "user_quotas_daily_select_own"
  on public.user_quotas_daily
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_quotas_daily_insert_own"
  on public.user_quotas_daily
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_quotas_daily_update_own"
  on public.user_quotas_daily
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_user_quotas_daily_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_quotas_daily_set_updated_at on public.user_quotas_daily;

create trigger user_quotas_daily_set_updated_at
  before update on public.user_quotas_daily
  for each row
  execute function public.set_user_quotas_daily_updated_at();

-- Incremento atómico "solo en éxito" desde servidor (security invoker, respeta RLS).
create or replace function public.increment_user_quota_daily(kind text)
returns void
language plpgsql
as $$
declare
  d date := (now() at time zone 'utc')::date;
begin
  insert into public.user_quotas_daily(user_id, date, inpaint_count, export_count)
  values (auth.uid(), d, 0, 0)
  on conflict (user_id, date) do nothing;

  if kind = 'inpaint' then
    update public.user_quotas_daily
    set inpaint_count = inpaint_count + 1
    where user_id = auth.uid() and date = d;
  elsif kind = 'export-print' then
    update public.user_quotas_daily
    set export_count = export_count + 1
    where user_id = auth.uid() and date = d;
  else
    raise exception 'invalid kind';
  end if;
end;
$$;

