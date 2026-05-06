-- Plans & limits: extend existing billing_plans without breaking Stripe

alter table public.billing_plans
  add column if not exists max_brand_kits int not null default 1;

update public.billing_plans set max_brand_kits = 1 where id = 'free';
update public.billing_plans set max_brand_kits = 10 where id = 'pro';
update public.billing_plans set max_brand_kits = 50 where id = 'business';

-- Optional compatibility view matching requested "plans" shape.
create or replace view public.plans as
select
  bp.id,
  bp.name,
  (bp.price_usd * 100)::int as price_monthly,
  bp.max_brand_kits,
  bp.export_print_limit as max_exports_per_day,
  bp.inpaint_limit as max_inpaints_per_day
from public.billing_plans bp;

