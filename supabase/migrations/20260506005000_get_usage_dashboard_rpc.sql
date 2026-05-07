-- Aggregated usage for dashboard (30d series, totals, month-to-date, today's quota row).
create or replace function public.get_usage_dashboard()
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();

  if uid is null then
    return json_build_object(
      'daily', '[]'::json,
      'totals', json_build_object('exports', 0, 'inpaints', 0),
      'month_to_date', json_build_object('exports', 0, 'inpaints', 0),
      'quota_today', json_build_object('exports', 0, 'inpaints', 0)
    );
  end if;

  return json_build_object(
    'daily', (
      select coalesce(
        json_agg(
          json_build_object(
            'date', day,
            'exports', exports,
            'inpaints', inpaints
          )
          order by day
        ),
        '[]'::json
      )
      from (
        select
          (date_trunc('day', created_at))::date::text as day,
          count(*) filter (where kind = 'export-print') as exports,
          count(*) filter (where kind = 'inpaint') as inpaints
        from usage_events
        where user_id = uid
          and created_at > now() - interval '30 days'
        group by 1
      ) s
    ),
    'totals', (
      select json_build_object(
        'exports', coalesce(count(*) filter (where kind = 'export-print'), 0),
        'inpaints', coalesce(count(*) filter (where kind = 'inpaint'), 0)
      )
      from usage_events
      where user_id = uid
        and created_at > now() - interval '30 days'
    ),
    'month_to_date', (
      select json_build_object(
        'exports', coalesce(count(*) filter (where kind = 'export-print'), 0),
        'inpaints', coalesce(count(*) filter (where kind = 'inpaint'), 0)
      )
      from usage_events
      where user_id = uid
        and created_at >= date_trunc('month', now())
    ),
    'quota_today', coalesce(
      (
        select json_build_object(
          'exports', export_print_count,
          'inpaints', inpaint_count
        )
        from user_quotas_daily
        where user_id = uid
          and date = current_date
        limit 1
      ),
      json_build_object('exports', 0, 'inpaints', 0)
    )
  );
end;
$$;

grant execute on function public.get_usage_dashboard() to authenticated;
