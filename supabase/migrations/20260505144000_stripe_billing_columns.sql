-- Stripe mapping: plans + subscriptions.

alter table public.billing_plans
  add column if not exists stripe_price_id text unique;

alter table public.user_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create index if not exists user_subscriptions_stripe_customer_idx
  on public.user_subscriptions (stripe_customer_id);

create index if not exists user_subscriptions_stripe_subscription_idx
  on public.user_subscriptions (stripe_subscription_id);

