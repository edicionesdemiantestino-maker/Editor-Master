-- Reemplazo de cuota diaria con consumo atómico (row lock + increment).
-- Nota: esta función *consume* cuota al momento de ejecución (no "solo en éxito").

-- Renombrar columna a nombre explícito si existe el schema previo.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_quotas_daily'
      and column_name = 'export_count'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_quotas_daily'
      and column_name = 'export_print_count'
  ) then
    alter table public.user_quotas_daily
      rename column export_count to export_print_count;
  end if;
end $$;

create or replace function public.consume_user_quota_daily(
  p_kind text,
  p_limit integer
)
returns boolean
language plpgsql
security invoker
as $$
declare
  v_user_id uuid;
  v_today date := current_date;
  v_current integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return false;
  end if;

  -- asegurar fila
  insert into public.user_quotas_daily (user_id, date, inpaint_count, export_print_count)
  values (v_user_id, v_today, 0, 0)
  on conflict (user_id, date) do nothing;

  -- lock de fila
  select
    case
      when p_kind = 'inpaint' then inpaint_count
      when p_kind = 'export-print' then export_print_count
      else 0
    end
  into v_current
  from public.user_quotas_daily
  where user_id = v_user_id and date = v_today
  for update;

  if v_current >= p_limit then
    return false;
  end if;

  -- incrementar
  if p_kind = 'inpaint' then
    update public.user_quotas_daily
    set inpaint_count = inpaint_count + 1,
        updated_at = now()
    where user_id = v_user_id and date = v_today;

  elsif p_kind = 'export-print' then
    update public.user_quotas_daily
    set export_print_count = export_print_count + 1,
        updated_at = now()
    where user_id = v_user_id and date = v_today;
  end if;

  return true;
end;
$$;

