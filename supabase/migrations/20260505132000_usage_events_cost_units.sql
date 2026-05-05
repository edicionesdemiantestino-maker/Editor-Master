-- Extiende usage_events para uso por unidades (source of truth para limits).

alter table public.usage_events
  add column if not exists cost_units integer not null default 1;

create index if not exists usage_events_user_kind_created_idx
  on public.usage_events (user_id, kind, created_at desc);

