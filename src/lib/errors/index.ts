import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ── Tipos de error normalizados ───────────────────────────────
export type AppError = {
  code: string;
  message: string;
  httpStatus: number;
  requestId?: string;
};

// ── Patrones internos que nunca deben llegar al cliente ───────
const INTERNAL_PATTERNS =
  /postgres|sql|supabase|prisma|mongoose|secret|token|password|cookie|stripe_sig/i;

// ── Normalizar cualquier error a AppError ─────────────────────
export function normalizeError(
  e: unknown,
  fallback = "Error interno del servidor",
): AppError {
  if (e instanceof ZodError) {
    const message = e.issues.map((i) => i.message).join(", ");
    return {
      code: "validation_error",
      message,
      httpStatus: 422,
    };
  }

  if (e instanceof Error) {
    const m = e.message.replace(/\s+/g, " ").trim();
    const isSafe =
      m.length > 0 &&
      m.length <= 200 &&
      !INTERNAL_PATTERNS.test(m);

    return {
      code: e.name ?? "unknown_error",
      message: isSafe ? m : fallback,
      httpStatus: 500,
    };
  }

  return {
    code: "unknown_error",
    message: fallback,
    httpStatus: 500,
  };
}

// ── Respuesta de error segura para APIs ───────────────────────
export function safeErrorResponse(
  e: unknown,
  requestId?: string,
  fallback = "Error interno del servidor",
): NextResponse {
  const err = normalizeError(e, fallback);
  return NextResponse.json(
    {
      error: err.code,
      message: err.message,
      ...(requestId ? { requestId } : {}),
    },
    { status: err.httpStatus },
  );
}

// ── Error de negocio tipado ───────────────────────────────────
export class AppBusinessError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "AppBusinessError";
  }
}

// ── Helpers específicos ───────────────────────────────────────
export function unauthorizedResponse(requestId?: string): NextResponse {
  return NextResponse.json(
    { error: "unauthorized", message: "No autorizado", requestId },
    { status: 401 },
  );
}

export function notFoundResponse(
  resource: string,
  requestId?: string,
): NextResponse {
  return NextResponse.json(
    {
      error: "not_found",
      message: `${resource} no encontrado`,
      requestId,
    },
    { status: 404 },
  );
}

export function rateLimitResponse(
  retryAfterMs: number,
  requestId?: string,
): NextResponse {
  const retrySec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    {
      error: "rate_limit",
      message: "Demasiadas solicitudes. Intentá más tarde.",
      retryAfterMs,
      requestId,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retrySec) },
    },
  );
}

export function validationErrorResponse(
  details: string,
  requestId?: string,
): NextResponse {
  return NextResponse.json(
    {
      error: "validation_failed",
      message: "Datos inválidos",
      details,
      requestId,
    },
    { status: 422 },
  );
}