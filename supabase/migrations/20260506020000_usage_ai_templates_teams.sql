-- amount (alias de unidades), nuevos kinds, RPC agregado por día, templates, colaboración.

-- 1) usage_events: columna amount + ampliar kinds
alter table public.usage_events
  add column if not exists amount integer not null default 1;

update public.usage_events
set amount = cost_units
where amount is distinct from cost_units;

alter table public.usage_events
  drop constraint if exists usage_events_kind_check;

alter table public.usage_events
  add constraint usage_events_kind_check
  check (kind in ('inpaint', 'export-print', 'ai-text'));

-- 2) Uso agregado por día (RLS: solo filas del usuario vía auth.uid())
create or replace function public.usage_by_day(p_days integer default 30)
returns table(day date, count bigint)
language sql
security invoker
set search_path = public
as $$
  select
    (created_at at time zone 'UTC')::date as day,
    count(*)::bigint
  from public.usage_events
  where user_id = auth.uid()
    and created_at >= (now() at time zone 'utc')
      - ((interval '1 day') * greatest(1, least(365, coalesce(p_days, 30))))
  group by 1
  order by 1;
$$;

grant execute on function public.usage_by_day(integer) to authenticated;

-- 3) Marketplace de plantillas (lectura para usuarios autenticados)
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  preview_url text,
  document jsonb not null default '{}'::jsonb,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists templates_created_at_idx on public.templates (created_at desc);

alter table public.templates enable row level security;

drop policy if exists "templates_select_authenticated" on public.templates;

create policy "templates_select_authenticated"
  on public.templates
  for select
  to authenticated
  using (true);

-- 4) Miembros de proyecto (colaboración base)
create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_idx on public.project_members (user_id);

alter table public.project_members enable row level security;

create policy "project_members_select"
  on public.project_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "project_members_write_owner"
  on public.project_members
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "project_members_update_owner"
  on public.project_members
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
  );

create policy "project_members_delete_owner"
  on public.project_members
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_members.project_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "projects_select_own" on public.projects;

create policy "projects_select_own_or_member"
  on public.projects
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = projects.id
        and pm.user_id = auth.uid()
    )
  );

drop policy if exists "projects_insert_own" on public.projects;

create policy "projects_insert_own"
  on public.projects
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;

create policy "projects_update_owner_or_editor"
  on public.projects
  for update
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = projects.id
        and pm.user_id = auth.uid()
        and pm.role = 'editor'
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = projects.id
        and pm.user_id = auth.uid()
        and pm.role = 'editor'
    )
  );

drop policy if exists "projects_delete_own" on public.projects;

create policy "projects_delete_owner_only"
  on public.projects
  for delete
  to authenticated
  using (auth.uid() = user_id);
