-- Brand Kit (Canva-like) persisted in Supabase

create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mi marca',
  created_at timestamptz default now()
);

create table if not exists public.brand_fonts (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid references public.brand_kits(id) on delete cascade,
  family text not null,
  weights int[] default '{400}'
);

create table if not exists public.brand_colors (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid references public.brand_kits(id) on delete cascade,
  hex text not null
);

alter table public.brand_kits enable row level security;
alter table public.brand_fonts enable row level security;
alter table public.brand_colors enable row level security;

drop policy if exists "own kits" on public.brand_kits;
create policy "own kits" on public.brand_kits
for all using (auth.uid() = user_id);

drop policy if exists "own fonts" on public.brand_fonts;
create policy "own fonts" on public.brand_fonts
for all using (
  exists (
    select 1 from public.brand_kits
    where public.brand_kits.id = public.brand_fonts.kit_id
      and public.brand_kits.user_id = auth.uid()
  )
);

drop policy if exists "own colors" on public.brand_colors;
create policy "own colors" on public.brand_colors
for all using (
  exists (
    select 1 from public.brand_kits
    where public.brand_kits.id = public.brand_colors.kit_id
      and public.brand_kits.user_id = auth.uid()
  )
);

