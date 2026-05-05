-- Idempotent usage tracking per job execution.
-- Prevents double-charging if a job is retried after partial success.

alter table public.usage_events
  add column if not exists job_id text;

-- Ensure we can't record usage twice for the same job+kind.
create unique index if not exists usage_events_job_kind_unique
  on public.usage_events (job_id, kind)
  where job_id is not null;

