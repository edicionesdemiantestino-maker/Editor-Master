-- ============================================================
-- FASE 1 PASO 3 — Storage hardening
-- Crear buckets faltantes + policies seguras + mime restrictions
-- ============================================================

-- ── 1. Actualizar bucket exports (restringir mime types) ─────
UPDATE storage.buckets
SET
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
WHERE id = 'exports';

-- ── 2. Crear bucket invoices (privado, solo PDFs) ────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- ── 3. Crear bucket sites (privado, HTML+CSS) ────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sites',
  'sites',
  false,
  5242880,
  ARRAY['text/html', 'text/css', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['text/html', 'text/css', 'text/plain'];

-- ── 4. Crear bucket brand-assets (privado, imágenes) ─────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- ── 5. Crear bucket templates (privado, JSONs + imágenes) ────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  false,
  10485760,
  ARRAY['application/json', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/json', 'image/png', 'image/jpeg', 'image/webp'];

-- ── 6. Crear bucket generated (privado, imágenes AI) ─────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated',
  'generated',
  false,
  15728640,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- ============================================================
-- POLICIES — invoices (solo el dueño, solo lectura)
-- ============================================================
DROP POLICY IF EXISTS "invoices_select_own" ON storage.objects;
CREATE POLICY "invoices_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "invoices_insert_own" ON storage.objects;
CREATE POLICY "invoices_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "invoices_service_insert" ON storage.objects;
CREATE POLICY "invoices_service_insert"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'invoices');

DROP POLICY IF EXISTS "invoices_service_select" ON storage.objects;
CREATE POLICY "invoices_service_select"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'invoices');

-- ============================================================
-- POLICIES — sites (dueño puede leer/escribir su carpeta)
-- ============================================================
DROP POLICY IF EXISTS "sites_select_own" ON storage.objects;
CREATE POLICY "sites_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sites'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "sites_insert_own" ON storage.objects;
CREATE POLICY "sites_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sites'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "sites_update_own" ON storage.objects;
CREATE POLICY "sites_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sites'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "sites_delete_own" ON storage.objects;
CREATE POLICY "sites_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sites'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "sites_service_all" ON storage.objects;
CREATE POLICY "sites_service_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'sites')
  WITH CHECK (bucket_id = 'sites');

-- ============================================================
-- POLICIES — brand-assets (solo el dueño)
-- ============================================================
DROP POLICY IF EXISTS "brand_assets_select_own" ON storage.objects;
CREATE POLICY "brand_assets_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "brand_assets_insert_own" ON storage.objects;
CREATE POLICY "brand_assets_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "brand_assets_update_own" ON storage.objects;
CREATE POLICY "brand_assets_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "brand_assets_delete_own" ON storage.objects;
CREATE POLICY "brand_assets_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- POLICIES — templates (lectura pública, escritura solo admins)
-- ============================================================
DROP POLICY IF EXISTS "templates_select_public" ON storage.objects;
CREATE POLICY "templates_select_public"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'templates');

DROP POLICY IF EXISTS "templates_service_all" ON storage.objects;
CREATE POLICY "templates_service_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'templates')
  WITH CHECK (bucket_id = 'templates');

-- ============================================================
-- POLICIES — generated (solo el dueño)
-- ============================================================
DROP POLICY IF EXISTS "generated_select_own" ON storage.objects;
CREATE POLICY "generated_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "generated_insert_own" ON storage.objects;
CREATE POLICY "generated_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "generated_delete_own" ON storage.objects;
CREATE POLICY "generated_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'generated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "generated_service_all" ON storage.objects;
CREATE POLICY "generated_service_all"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'generated')
  WITH CHECK (bucket_id = 'generated');

-- ============================================================
-- RLS en tablas relacionadas — verificar y reforzar
-- ============================================================

-- brand_kits
ALTER TABLE IF EXISTS public.brand_kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brand_kits_select_own" ON public.brand_kits;
CREATE POLICY "brand_kits_select_own"
  ON public.brand_kits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "brand_kits_insert_own" ON public.brand_kits;
CREATE POLICY "brand_kits_insert_own"
  ON public.brand_kits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "brand_kits_update_own" ON public.brand_kits;
CREATE POLICY "brand_kits_update_own"
  ON public.brand_kits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "brand_kits_delete_own" ON public.brand_kits;
CREATE POLICY "brand_kits_delete_own"
  ON public.brand_kits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- usage_events (solo lectura propia)
ALTER TABLE IF EXISTS public.usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_events_select_own" ON public.usage_events;
CREATE POLICY "usage_events_select_own"
  ON public.usage_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_events_service_all" ON public.usage_events;
CREATE POLICY "usage_events_service_all"
  ON public.usage_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- user_subscriptions (solo lectura propia)
ALTER TABLE IF EXISTS public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_select_own"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_subscriptions_service_all" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_service_all"
  ON public.user_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);