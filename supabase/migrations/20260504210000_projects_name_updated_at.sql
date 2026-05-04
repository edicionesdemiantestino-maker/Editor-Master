-- Metadatos de proyecto alineados con la app (listado, orden, auditoría).
alter table public.projects
  add column if not exists name text not null default 'Sin título';

alter table public.projects
  add column if not exists updated_at timestamptz not null default now();

-- Backfill: filas existentes heredan created_at como updated_at si hace falta.
update public.projects
set updated_at = coalesce(updated_at, created_at)
where true;

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;

create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_projects_updated_at();
