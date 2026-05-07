-- ============================================================
-- FASE 1 PASO 2 — Harden stripe_webhook_events
-- ============================================================

-- Agregar columnas faltantes si no existen
ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'processing',
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Garantizar UNIQUE en id (stripe_event_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stripe_webhook_events_pkey'
      AND conrelid = 'public.stripe_webhook_events'::regclass
  ) THEN
    ALTER TABLE public.stripe_webhook_events
      ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Índice para queries por status y event_type
CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_idx
  ON public.stripe_webhook_events (status);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_event_type_idx
  ON public.stripe_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_created_at_idx
  ON public.stripe_webhook_events (created_at DESC);

-- RLS
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede leer/escribir
DROP POLICY IF EXISTS "webhook_events_service_only" ON public.stripe_webhook_events;
CREATE POLICY "webhook_events_service_only"
  ON public.stripe_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Constraint: balance nunca negativo en user_credits
ALTER TABLE public.user_credits
  DROP CONSTRAINT IF EXISTS user_credits_balance_non_negative;
ALTER TABLE public.user_credits
  ADD CONSTRAINT user_credits_balance_non_negative
  CHECK (balance >= 0);