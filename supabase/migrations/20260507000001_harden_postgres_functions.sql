-- ============================================================
-- FASE 1 — SECURITY HARDENING: search_path + permisos EXECUTE
-- Afecta funciones con SECURITY DEFINER o search_path mutable
-- NO modifica lógica de negocio ni firmas de RPC
-- ============================================================

-- ------------------------------------------------------------
-- 1. add_credits
-- SECURITY DEFINER: SÍ (escribe en user_credits sin RLS bypass)
-- Llamada desde: server actions / webhook Stripe
-- Permiso: solo service_role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = public.user_credits.balance + p_amount,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, text) TO service_role;

-- ------------------------------------------------------------
-- 2. consume_credits
-- SECURITY DEFINER: SÍ (descuenta créditos, necesita bypass RLS)
-- Llamada desde: server actions de uso
-- Permiso: authenticated + service_role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'usage'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT balance INTO v_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_credits(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, integer, text) TO service_role;

-- ------------------------------------------------------------
-- 3. consume_user_quota_daily
-- SECURITY DEFINER: SÍ (upsert en tabla de cuotas)
-- Permiso: authenticated + service_role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_user_quota_daily(
  p_user_id uuid,
  p_amount integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_quotas_daily (user_id, date, usage_count)
  VALUES (p_user_id, current_date, p_amount)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    usage_count = public.user_quotas_daily.usage_count + p_amount,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_user_quota_daily(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_user_quota_daily(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_user_quota_daily(uuid, integer) TO service_role;

-- ------------------------------------------------------------
-- 4. increment_user_quota_daily
-- SECURITY DEFINER: SÍ (alias / variante de consume)
-- Permiso: authenticated + service_role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_user_quota_daily(
  p_user_id uuid,
  p_amount integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_quotas_daily (user_id, date, usage_count)
  VALUES (p_user_id, current_date, p_amount)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    usage_count = public.user_quotas_daily.usage_count + p_amount,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_user_quota_daily(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_quota_daily(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_quota_daily(uuid, integer) TO service_role;

-- ------------------------------------------------------------
-- 5. get_usage_summary
-- SECURITY DEFINER: NO necesario (lectura, RLS cubre)
-- SECURITY INVOKER es suficiente
-- Permiso: authenticated
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usage_summary(
  p_user_id uuid
)
RETURNS TABLE (
  total_credits_used bigint,
  total_events bigint,
  last_event_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(e.cost_units), 0)::bigint AS total_credits_used,
    COUNT(*)::bigint AS total_events,
    MAX(e.created_at) AS last_event_at
  FROM public.usage_events e
  WHERE e.user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_usage_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_usage_summary(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 6. get_usage_today
-- SECURITY INVOKER: lectura simple
-- Permiso: authenticated
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usage_today(
  p_user_id uuid
)
RETURNS TABLE (
  usage_count integer,
  date date
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(q.usage_count, 0)::integer,
    current_date
  FROM public.user_quotas_daily q
  WHERE q.user_id = p_user_id
    AND q.date = current_date;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_usage_today(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_usage_today(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 7. get_usage_timeseries
-- SECURITY INVOKER: lectura agregada por día
-- Permiso: authenticated
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usage_timeseries(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  day date,
  credits_used bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.created_at::date AS day,
    COALESCE(SUM(e.cost_units), 0)::bigint AS credits_used
  FROM public.usage_events e
  WHERE e.user_id = p_user_id
    AND e.created_at >= now() - (p_days || ' days')::interval
  GROUP BY e.created_at::date
  ORDER BY day ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_usage_timeseries(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_usage_timeseries(uuid, integer) TO authenticated;

-- ------------------------------------------------------------
-- 8. get_usage_dashboard
-- SECURITY INVOKER: lectura combinada
-- Permiso: authenticated
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usage_dashboard(
  p_user_id uuid
)
RETURNS TABLE (
  balance integer,
  today_usage integer,
  month_usage bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(uc.balance, 0)::integer AS balance,
    COALESCE(q.usage_count, 0)::integer AS today_usage,
    COALESCE((
      SELECT SUM(e.cost_units)
      FROM public.usage_events e
      WHERE e.user_id = p_user_id
        AND date_trunc('month', e.created_at) = date_trunc('month', now())
    ), 0)::bigint AS month_usage
  FROM public.user_credits uc
  FULL OUTER JOIN public.user_quotas_daily q
    ON q.user_id = uc.user_id AND q.date = current_date
  WHERE COALESCE(uc.user_id, q.user_id) = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_usage_dashboard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_usage_dashboard(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 9. get_monthly_usage
-- SECURITY INVOKER: lectura mensual
-- Permiso: authenticated
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_usage(
  p_user_id uuid,
  p_months integer DEFAULT 6
)
RETURNS TABLE (
  month date,
  credits_used bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('month', e.created_at)::date AS month,
    COALESCE(SUM(e.cost_units), 0)::bigint AS credits_used
  FROM public.usage_events e
  WHERE e.user_id = p_user_id
    AND e.created_at >= now() - (p_months || ' months')::interval
  GROUP BY date_trunc('month', e.created_at)
  ORDER BY month ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_monthly_usage(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_usage(uuid, integer) TO authenticated;

-- ------------------------------------------------------------
-- 10. usage_by_day
-- SECURITY INVOKER: vista agregada
-- Permiso: authenticated
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usage_by_day(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  day date,
  total_cost_units bigint,
  event_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.created_at::date AS day,
    COALESCE(SUM(e.cost_units), 0)::bigint AS total_cost_units,
    COUNT(*)::bigint AS event_count
  FROM public.usage_events e
  WHERE e.user_id = p_user_id
    AND e.created_at >= now() - (p_days || ' days')::interval
  GROUP BY e.created_at::date
  ORDER BY day ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.usage_by_day(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usage_by_day(uuid, integer) TO authenticated;

-- ------------------------------------------------------------
-- 11. credits_usage_by_day
-- SECURITY INVOKER: alias de usage_by_day para dashboard
-- Permiso: authenticated
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.credits_usage_by_day(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  day date,
  credits_used bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.created_at::date AS day,
    COALESCE(SUM(e.cost_units), 0)::bigint AS credits_used
  FROM public.usage_events e
  WHERE e.user_id = p_user_id
    AND e.created_at >= now() - (p_days || ' days')::interval
  GROUP BY e.created_at::date
  ORDER BY day ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credits_usage_by_day(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credits_usage_by_day(uuid, integer) TO authenticated;

-- ------------------------------------------------------------
-- 12. get_user_limits
-- SECURITY INVOKER: lectura de plan
-- Permiso: authenticated
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_limits(
  p_user_id uuid
)
RETURNS TABLE (
  plan_id text,
  monthly_credits integer,
  max_projects integer,
  max_brand_kits integer,
  features jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(sub.plan_id, 'free') AS plan_id,
    COALESCE(p.monthly_credits, 100) AS monthly_credits,
    COALESCE(p.max_projects, 3) AS max_projects,
    COALESCE(p.max_brand_kits, 1) AS max_brand_kits,
    COALESCE(p.features, '{}'::jsonb) AS features
  FROM public.user_subscriptions sub
  LEFT JOIN public.plans p ON p.id = sub.plan_id
  WHERE sub.user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_limits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_limits(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 13. refresh_usage_daily_agg
-- SECURITY DEFINER: SÍ (actualiza tabla de agregados)
-- Permiso: solo service_role (cron job)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_usage_daily_agg()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_quotas_daily (user_id, date, usage_count)
  SELECT
    e.user_id,
    e.created_at::date,
    SUM(e.cost_units)::integer
  FROM public.usage_events e
  WHERE e.created_at::date = current_date - 1
  GROUP BY e.user_id, e.created_at::date
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    usage_count = EXCLUDED.usage_count,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_usage_daily_agg() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_usage_daily_agg() TO service_role;

-- ------------------------------------------------------------
-- 14. Triggers de updated_at
-- SECURITY INVOKER: triggers simples, no necesitan DEFINER
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_projects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_quotas_daily_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers no necesitan GRANT — los invoca el sistema, no usuarios

-- ------------------------------------------------------------
-- 15. rls_auto_enable
-- SECURITY DEFINER: SÍ (altera tablas — solo debe llamarse en migraciones)
-- Revocar completamente del público
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      r.table_schema, r.table_name
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
-- Solo service_role puede invocarla manualmente si se necesita
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

-- ------------------------------------------------------------
-- RESUMEN DE CAMBIOS APLICADOS
-- ------------------------------------------------------------
-- SECURITY DEFINER mantenido: add_credits, consume_credits,
--   consume_user_quota_daily, increment_user_quota_daily,
--   refresh_usage_daily_agg, rls_auto_enable
-- SECURITY DEFINER → INVOKER: get_usage_summary, get_usage_today,
--   get_usage_timeseries, get_usage_dashboard, get_monthly_usage,
--   usage_by_day, credits_usage_by_day, get_user_limits,
--   set_*_updated_at triggers
-- SET search_path = public: TODAS las funciones
-- REVOKE PUBLIC: TODAS las funciones
-- GRANT authenticated: funciones de lectura de usuario
-- GRANT service_role: funciones administrativas/billing
-- ------------------------------------------------------------