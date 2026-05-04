import { isSentryDsnConfigured } from "./sentry-readiness";

/**
 * Punto único para errores no controlados en servidor (log JSON).
 * Si `SENTRY_DSN` está definido, el operador debe instalar `@sentry/nextjs` y cablear
 * `captureException` en `instrumentation.ts` (no se importa aquí para no forzar la dependencia).
 */
export async function reportServerException(
  ctx: { segment: string; requestId?: string; userId?: string },
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "Error";
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      type: "exception",
      ...ctx,
      name,
      message: message.slice(0, 2000),
      sentryDsnConfigured: isSentryDsnConfigured(),
    }),
  );
}
