/**
 * Señales para integrar Sentry (u otro APM) sin acoplar `@sentry/nextjs` en el bundle base.
 * En `instrumentation.ts` o en el host, leé `isSentryDsnConfigured()` y montá el SDK oficial.
 */

export function isSentryDsnConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim());
}

export function describeSentryIntegrationHint(): string {
  return isSentryDsnConfigured()
    ? "SENTRY_DSN definido: instalá @sentry/nextjs y seguí la guía Next (instrumentation + edge/server configs)."
    : "SENTRY_DSN no definido: los errores solo van a logs JSON (reportServerException).";
}
