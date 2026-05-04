/**
 * Entorno público de la app (Next.js + Vercel + Supabase Auth).
 *
 * Reglas:
 * - `NEXT_PUBLIC_*` se inyecta en build; en Vercel definila en Project Settings → Environment Variables.
 * - Nunca coloques `service_role` ni secretos en `NEXT_PUBLIC_*`.
 * - En servidor, Supabase debe usarse con `createServerClient` + cookies (RLS con `auth.uid()`).
 *
 * @see `src/lib/supabase/env.ts` — fuente única de lectura de `process.env`.
 */

export {
  assertPublicSupabaseEnv,
  getPublicSupabaseEnv,
  getSiteOrigin,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  warnSiteUrlIfProductionLike,
  type SupabasePublicEnv,
} from "@/lib/supabase/env";

export {
  getTrustedRequestOrigin,
} from "@/lib/supabase/trusted-origin";

/** True cuando el runtime es Vercel (preview o production). */
export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL?.trim());
}

/** URL pública de preview/production en Vercel (`https://` + host). */
export function getVercelDeploymentOrigin(): string | null {
  const host = process.env.VERCEL_URL?.trim();
  if (!host) return null;
  return `https://${host}`;
}
