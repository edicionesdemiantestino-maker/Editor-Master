-- Auditoría y performance para listados / aperturas.

alter table public.projects
  add column if not exists last_opened_at timestamptz;

-- Backfill (opcional): si no existe, igualamos a created_at para ordenar coherente.
update public.projects
set last_opened_at = coalesce(last_opened_at, created_at)
where true;

-- Índice para listados por usuario (RLS filtra por user_id) y orden por updated_at.
create index if not exists projects_user_id_updated_at_idx
  on public.projects (user_id, updated_at desc);

-- Índice auxiliar para auditoría (últimas aperturas).
create index if not exists projects_user_id_last_opened_at_idx
  on public.projects (user_id, last_opened_at desc);

