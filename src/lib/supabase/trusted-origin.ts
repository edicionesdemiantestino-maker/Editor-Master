import { getSiteOrigin } from "./env";

/**
 * Orígenes permitidos para redirects post-OAuth / email (evita open-redirect si el request llega con Host raro).
 * Producción: `NEXT_PUBLIC_SITE_URL` y, en Vercel, la URL de preview (`VERCEL_URL`).
 */
export function getTrustedRequestOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  const siteOrigin = new URL(getSiteOrigin()).origin;
  if (requestOrigin === siteOrigin) {
    return requestOrigin;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const vercelOrigin = new URL(`https://${vercel}`).origin;
    if (requestOrigin === vercelOrigin) {
      return requestOrigin;
    }
  }
  // Desalineación Host vs SITE_URL: preferimos SITE_URL (coherente con enlaces de email).
  return siteOrigin;
}
