// ============================================================
// Logger estructurado — Editor Maestro
// Formato JSON en una línea (compatible con Vercel/Datadog)
// NUNCA loguear: tokens, cookies, passwords, secrets
// ============================================================

export type LogLevel = "info" | "warn" | "error" | "debug";

export type LogContext = {
  module: string;
  event: string;
  requestId?: string;
  userId?: string;
  durationMs?: number;
  httpStatus?: number;
  code?: string;
  [key: string]: unknown;
};

const SENSITIVE_KEYS = new Set([
  "token",
  "secret",
  "password",
  "cookie",
  "authorization",
  "stripe_signature",
  "webhook_secret",
  "api_key",
  "apikey",
  "private_key",
]);

function sanitizeContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      result[k] = "[REDACTED]";
    } else if (typeof v === "string" && v.length > 2000) {
      result[k] = v.slice(0, 200) + "...[truncated]";
    } else {
      result[k] = v;
    }
  }
  return result;
}

function write(level: LogLevel, ctx: LogContext): void {
  const { module, event, ...rest } = ctx;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    module,
    event,
    ...sanitizeContext(rest),
  });

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(line);
      }
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  info: (ctx: LogContext) => write("info", ctx),
  warn: (ctx: LogContext) => write("warn", ctx),
  error: (ctx: LogContext) => write("error", ctx),
  debug: (ctx: LogContext) => write("debug", ctx),
};

// ── Factory: logger con módulo fijo ──────────────────────────
export function createLogger(module: string) {
  return {
    info: (event: string, meta?: Omit<LogContext, "module" | "event">) =>
      write("info", { module, event, ...meta }),
    warn: (event: string, meta?: Omit<LogContext, "module" | "event">) =>
      write("warn", { module, event, ...meta }),
    error: (event: string, meta?: Omit<LogContext, "module" | "event">) =>
      write("error", { module, event, ...meta }),
    debug: (event: string, meta?: Omit<LogContext, "module" | "event">) =>
      write("debug", { module, event, ...meta }),
  };
}

// ── Helper: medir duración ────────────────────────────────────
export function startTimer(): () => number {
  const t0 = Date.now();
  return () => Date.now() - t0;
}

// ── Loggers por módulo ────────────────────────────────────────
export const stripeLogger = createLogger("stripe/webhook");
export const authLogger = createLogger("auth");
export const editorLogger = createLogger("editor");
export const exportLogger = createLogger("export");
export const aiLogger = createLogger("ai");
export const storageLogger = createLogger("storage");
export const jobLogger = createLogger("jobs");
export const cmsLogger = createLogger("cms");