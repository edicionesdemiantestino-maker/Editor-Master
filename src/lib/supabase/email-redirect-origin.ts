import { headers } from "next/headers";

import { getSiteOrigin } from "./env";

/**
 * Override opcional (solo origen): mismo valor que querés permitir en Supabase Redirect URLs.
 * Ej.: `https://editor-master.vercel.app` — útil si previews y SITE_URL chocan con GoTrue.
 */
function parseOriginOverride(raw: string): string | null {
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
 * Origen para `emailRedirectTo` en registro / magic link.
 * Usa el host **real** del request (preview `*.vercel.app`, dominio custom, localhost)
 * si es seguro; si no, cae en `getSiteOrigin()` (NEXT_PUBLIC_SITE_URL / Vercel env).
 * Así Supabase acepta el redirect si en Dashboard tenés p. ej. `https://*.vercel.app/**`.
 */
function isAllowedRedirectHost(
  requestHost: string,
  canonicalHost: string,
): boolean {
  const r = requestHost.toLowerCase();
  const c = canonicalHost.toLowerCase();
  if (r === c) return true;
  if (r.endsWith(".vercel.app")) return true;
  if (r.startsWith("localhost") || r.startsWith("127.")) return true;
  return false;
}

function buildOrigin(proto: string, host: string): string {
  const p = proto === "http" || proto === "https" ? proto : "https";
  return `${p}://${host}`;
}

export async function getEmailRedirectOrigin(): Promise<string> {
  const envOverride = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN?.trim();
  if (envOverride) {
    const o = parseOriginOverride(envOverride);
    if (o) return o;
  }

  const fallback = getSiteOrigin();
  let canonicalHost: string;
  try {
    canonicalHost = new URL(fallback).host;
  } catch {
    return fallback;
  }

  try {
    const h = await headers();
    const rawHost =
      h.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      h.get("host")?.trim();
    if (!rawHost) return fallback;

    if (!isAllowedRedirectHost(rawHost, canonicalHost)) {
      return fallback;
    }

    const protoHeader = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const isLocal = /^localhost\b|^127\./i.test(rawHost);
    const proto =
      isLocal
        ? protoHeader === "https" || protoHeader === "http"
          ? protoHeader
          : "http"
        : protoHeader === "https" || protoHeader === "http"
          ? protoHeader
          : "https";

    return buildOrigin(proto, rawHost);
  } catch {
    return fallback;
  }
}
