/**
 * URL y anon key son **públicas** por diseño (Supabase); van al bundle del cliente.
 * En servidor solo deben usarse con `createServerClient` + cookies de sesión para que RLS aplique con `auth.uid()`.
 * Nunca uses aquí `service_role`.
 *
 * Vercel: definí las mismas `NEXT_PUBLIC_*` en Project Settings → Environment Variables
 * para Production y Preview. `process.env` se resuelve en build/runtime según el entorno.
 *
 * Re-export centralizado: `src/lib/env/public-app-env.ts`.
 */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
}

/** Soporta clave `anon` legacy o publishable nueva. */
export function getSupabaseAnonKey(): string | undefined {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return anon || pub;
}

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function getPublicSupabaseEnv(): SupabasePublicEnv | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** Inicialización estricta de cliente SSR o browser (falla rápido si falta config). */
export function assertPublicSupabaseEnv(): SupabasePublicEnv {
  const v = getPublicSupabaseEnv();
  if (!v) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  return v;
}

export function isSupabaseConfigured(): boolean {
  return getPublicSupabaseEnv() !== null;
}

/**
 * Devuelve solo el origen (`https://host[:puerto]`), sin path.
 * Así `emailRedirectTo` queda `origin/auth/callback` y nunca `…/callback/auth/callback`
 * (Supabase: "Invalid path specified in request URL").
 */
function toPublicOrigin(raw: string): string | null {
  const t = raw.trim().replace(/\/$/, "");
  if (!t) return null;
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    return new URL(withProto).origin;
  } catch {
    return null;
  }
}

/**
 * Origen público de la app (magic links, OAuth redirect, `emailRedirectTo`).
 *
 * Prioridad: `NEXT_PUBLIC_SITE_URL` → URLs automáticas en Vercel (`VERCEL_PROJECT_PRODUCTION_URL`,
 * `VERCEL_URL`) → localhost. Solo el **origen** (sin `/ruta`); en Vercel se puede omitir
 * `NEXT_PUBLIC_SITE_URL` y usar `VERCEL_URL`.
 */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    const o = toPublicOrigin(explicit);
    if (o) return o;
  }

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) {
    const o = toPublicOrigin(prod);
    if (o) return o;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const o = toPublicOrigin(host.startsWith("http") ? host : `https://${host}`);
    if (o) return o;
  }

  return "http://localhost:3000";
}

let siteUrlWarned = false;

/** Aviso único si parece deploy productivo sin SITE_URL explícita. */
export function warnSiteUrlIfProductionLike(): void {
  if (siteUrlWarned) return;
  const isProd =
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  if (!isProd) return;
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) return;
  siteUrlWarned = true;
  console.warn(
    "[Editor Maestro] NEXT_PUBLIC_SITE_URL no está definida en un entorno productivo. " +
      "Configurála para que Auth (redirects, magic links) coincida con el dominio real.",
  );
}
