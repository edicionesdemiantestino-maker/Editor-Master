/**
 * Arranque del runtime Node (Next `instrumentation`).
 * Avisos de configuración sin secretos.
 */
import { describeSentryIntegrationHint } from "./lib/observability/sentry-readiness";
import { warnSiteUrlIfProductionLike } from "./lib/supabase/env";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    warnSiteUrlIfProductionLike();
    console.info(`[Editor Maestro] ${describeSentryIntegrationHint()}`);
  }
}
