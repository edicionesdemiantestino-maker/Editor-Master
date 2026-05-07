import { z } from "zod";
import { imageDataUrlSchema } from "./common.schemas";

// ── Prompt base ───────────────────────────────────────────────
const promptSchema = z
  .string()
  .min(3, { message: "El prompt debe tener al menos 3 caracteres" })
  .max(2000, { message: "El prompt no puede superar 2000 caracteres" })
  .transform((s) => s.replace(/\u0000/g, "").trim());

// ── Generar template ──────────────────────────────────────────
export const generateTemplateSchema = z.object({
  prompt: promptSchema,
});

export type GenerateTemplateInput = z.infer<typeof generateTemplateSchema>;

// ── Generar landing page ──────────────────────────────────────
export const generateLandingSchema = z.object({
  prompt: promptSchema,
  industry: z
    .enum([
      "fitness",
      "food",
      "tech",
      "fashion",
      "realestate",
      "education",
      "general",
    ])
    .optional(),
});

export type GenerateLandingInput = z.infer<typeof generateLandingSchema>;

// ── Generar texto ─────────────────────────────────────────────
export const generateTextSchema = z.object({
  prompt: promptSchema,
  context: z
    .string()
    .max(500)
    .optional()
    .transform((s) => s?.replace(/\u0000/g, "").trim()),
  maxTokens: z.coerce
    .number()
    .int()
    .min(10)
    .max(2000)
    .default(500),
  temperature: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(0.7),
});

export type GenerateTextInput = z.infer<typeof generateTextSchema>;

// ── Inpaint / magic erase ─────────────────────────────────────
export const inpaintRequestSchema = z.object({
  imageDataUrl: imageDataUrlSchema,
  maskDataUrl: imageDataUrlSchema,
  prompt: z
    .string()
    .max(2000)
    .optional()
    .transform((s) => s?.replace(/\u0000/g, "").trim() || undefined),
});

export type InpaintRequestInput = z.infer<typeof inpaintRequestSchema>;

// ── Image proxy ───────────────────────────────────────────────
export const imageProxySchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), {
      message: "Solo URLs HTTPS",
    })
    .refine(
      (u) => {
        try {
          const h = new URL(u).hostname.toLowerCase();
          return h === "replicate.delivery" || h.endsWith(".replicate.delivery");
        } catch {
          return false;
        }
      },
      { message: "Host no permitido" },
    ),
});

export type ImageProxyInput = z.infer<typeof imageProxySchema>;

// ── Límites de uso por feature ────────────────────────────────
export const aiFeatureSchema = z.enum([
  "inpaint",
  "generate-template",
  "generate-landing",
  "generate-text",
  "image-proxy",
]);

export type AiFeature = z.infer<typeof aiFeatureSchema>;

// ── Respuesta de generación ───────────────────────────────────
export const aiGenerationResponseSchema = z.object({
  ok: z.boolean(),
  document: z.unknown().optional(),
  text: z.string().optional(),
  outputUrl: z.string().url().optional(),
  requestId: z.string().optional(),
});

export type AiGenerationResponse = z.infer<typeof aiGenerationResponseSchema>;