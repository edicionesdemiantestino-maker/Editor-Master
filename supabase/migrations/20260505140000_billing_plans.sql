create table if not exists public.billing_plans (
  id text primary key,
  name text not null,
  price_usd numeric(10,2) not null default 0,

  inpaint_limit int not null,
  export_print_limit int not null,

  created_at timestamptz not null default now()
);

insert into public.billing_plans (id, name, price_usd, inpaint_limit, export_print_limit)
values
  ('free', 'Free', 0, 20, 10),
  ('pro', 'Pro', 12, 200, 100),
  ('business', 'Business', 49, 1000, 500)
on conflict (id) do nothing;

