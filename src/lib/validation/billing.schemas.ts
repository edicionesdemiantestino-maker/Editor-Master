import { z } from "zod";
import { uuidSchema, imageDataUrlSchema } from "./common.schemas";

// ── Compra de créditos ────────────────────────────────────────
export const buyCreditsSchema = z.object({
  credits: z.coerce
    .number()
    .int()
    .min(10, { message: "Mínimo 10 créditos" })
    .max(100_000, { message: "Máximo 100.000 créditos por compra" }),
  priceId: z.string().min(1).max(100).optional(),
});

export type BuyCreditsInput = z.infer<typeof buyCreditsSchema>;

// ── Checkout Stripe ───────────────────────────────────────────
export const checkoutSchema = z.object({
  planId: z.string().min(1).max(80),
  userId: uuidSchema,
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ── Metadata de Stripe (webhook) ──────────────────────────────
export const stripeMetadataSchema = z.object({
  user_id: uuidSchema,
  plan_id: z.string().min(1).max(80).optional(),
  purchase_type: z
    .enum(["credits", "subscription", "template"])
    .optional(),
  credits: z.coerce.number().int().min(1).optional(),
});

export type StripeMetadata = z.infer<typeof stripeMetadataSchema>;

// ── Export print (PDF CMYK) ───────────────────────────────────
export const exportPrintSchema = z.object({
  imageDataUrl: imageDataUrlSchema,
  bleedMm: z.coerce
    .number()
    .min(0)
    .max(20)
    .default(3),
  title: z
    .string()
    .max(200)
    .default("export-print")
    .transform((s) => s.replace(/\u0000/g, "").trim()),
  drawCropMarks: z.boolean().default(false),
  targetDpi: z.coerce
    .number()
    .int()
    .min(72)
    .max(600)
    .default(300),
});

export type ExportPrintInput = z.infer<typeof exportPrintSchema>;

// ── Auto top-up settings ──────────────────────────────────────
export const autoTopupSettingsSchema = z.object({
  enabled: z.boolean(),
  threshold: z.coerce.number().int().min(0).max(10_000),
  amount: z.coerce.number().int().min(10).max(10_000),
});

export type AutoTopupSettings = z.infer<typeof autoTopupSettingsSchema>;

// ── Webhook metadata validator (safeParse) ────────────────────
export function validateStripeMetadata(
  raw: Record<string, string> | null | undefined,
): { ok: true; data: StripeMetadata } | { ok: false; reason: string } {
  const result = stripeMetadataSchema.safeParse(raw ?? {});
  if (!result.success) {
    return {
      ok: false,
      reason: result.error.issues.map((i) => i.message).join(", "),
    };
  }
  return { ok: true, data: result.data };
}