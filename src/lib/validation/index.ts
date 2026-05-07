// ── Re-exports centralizados ──────────────────────────────────
export * from "./common.schemas";
export * from "./auth.schemas";
export * from "./billing.schemas";
export * from "./editor.schemas";
export * from "./cms.schemas";
export * from "./ai.schemas";

import { z } from "zod";
import type { ZodSchema } from "zod";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

// ── Helper: validar body de API ───────────────────────────────
export async function validateRequestBody<T>(
  req: Request,
  schema: ZodSchema<T>,
) {
  const requestId = randomUUID();
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "invalid_json", requestId },
        { status: 400 },
      ),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "validation_failed", details: messages, requestId },
        { status: 422 },
      ),
    };
  }
  return { ok: true as const, data: result.data };
}

// ── Helper: validar FormData ──────────────────────────────────
export function parseZodFormData<T>(
  formData: FormData,
  schema: ZodSchema<T>,
): { ok: true; data: T } | { ok: false; errors: string[] } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => i.message),
    };
  }
  return { ok: true, data: result.data };
}

// ── Helper: validar query params ──────────────────────────────
export function parseZodSearchParams<T>(
  url: string,
  schema: ZodSchema<T>,
): { ok: true; data: T } | { ok: false; errors: string[] } {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((i) => i.message),
    };
  }
  return { ok: true, data: result.data };
}

// ── Helper: safe server action ────────────────────────────────
export async function safeAction<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error desconocido";
    const safe =
      /postgres|sql|secret|token|password|supabase/i.test(message)
        ? "Error interno del servidor"
        : message.slice(0, 200);
    return { ok: false, error: safe };
  }
}

// ── Helper: primera issue de Zod como string ──────────────────
export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validation error";
}