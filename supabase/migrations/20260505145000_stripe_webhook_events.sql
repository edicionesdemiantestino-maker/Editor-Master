-- Idempotencia webhook Stripe: evita doble-proceso del mismo event.id

create table if not exists public.stripe_webhook_events (
  id text primary key,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- Nadie desde el cliente debe leer/escribir esto. Solo server con service_role.
revoke all on public.stripe_webhook_events from anon, authenticated;

