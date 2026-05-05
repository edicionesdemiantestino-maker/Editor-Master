/**
 * Logs JSON en una línea (CloudWatch / Datadog / etc.).
 * Nunca loguear tokens, cookies ni cuerpos base64 completos.
 */

export type LogLevel = "info" | "warn" | "error";

/** Superficies del servidor que emiten telemetría homogénea. */
export type StructuredLogService =
  | "api/inpaint"
  | "api/image-proxy"
  | "api/export-print"
  | "api/internal/cleanup-exports"
  | "route/auth-callback"
  | "actions/projects"
  | "actions/auth"
  | "actions/project-document"
  | "actions/project-persistence"
  | "lib/require-server-user";

export type StructuredLogContext = {
  readonly service: StructuredLogService;
  /** Correlación: request HTTP o invocación de Server Action. */
  readonly requestId?: string;
  readonly userId?: string;
  readonly event: string;
  readonly durationMs?: number;
  readonly httpStatus?: number;
  /** Código interno estable (no mensajes de terceros ni PII). */
  readonly code?: string;
  /** Enteros métricos (p. ej. bytes devueltos por proxy). */
  readonly bytesOut?: number;
};

export function logStructuredLine(
  ctx: StructuredLogContext,
  level: LogLevel = "info",
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    ...ctx,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
