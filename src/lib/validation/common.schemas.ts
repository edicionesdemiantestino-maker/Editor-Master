import { z } from "zod";

// ── IDs ──────────────────────────────────────────────────────
export const uuidSchema = z
  .string()
  .uuid({ message: "ID inválido" });

export const userIdSchema = uuidSchema;

// ── Paginación ───────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Texto seguro ─────────────────────────────────────────────
export const safeStringSchema = (max = 500) =>
  z
    .string()
    .min(1)
    .max(max)
    .transform((s) => s.replace(/\u0000/g, "").trim());

export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones");

// ── URLs ─────────────────────────────────────────────────────
export const httpsUrlSchema = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), {
    message: "Solo se permiten URLs HTTPS",
  });

// ── Data URL de imagen ───────────────────────────────────────
const ALLOWED_DATA_URL_PREFIXES = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/webp;base64,",
] as const;

export const imageDataUrlSchema = z
  .string()
  .min(40)
  .refine(
    (v) => ALLOWED_DATA_URL_PREFIXES.some((p) => v.startsWith(p)),
    { message: "Formato de imagen no permitido" },
  );

// ── Colores ──────────────────────────────────────────────────
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color hex inválido");

// ── Respuesta de error segura ────────────────────────────────
export type SafeError = {
  error: string;
  code: string;
  requestId?: string;
};

export function toSafeError(
  e: unknown,
  fallback = "Error interno del servidor",
): string {
  if (!(e instanceof Error)) return fallback;
  const m = e.message.replace(/\s+/g, " ").trim();
  if (
    m.length === 0 ||
    m.length > 200 ||
    /postgres|sql|supabase|secret|token|password/i.test(m)
  ) {
    return fallback;
  }
  return m;
}