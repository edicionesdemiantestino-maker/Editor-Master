import { z } from "zod";
import { uuidSchema, slugSchema, safeStringSchema } from "./common.schemas";

// ── Crear colección CMS ───────────────────────────────────────
export const createCollectionSchema = z.object({
  siteId: uuidSchema,
  name: safeStringSchema(100),
  slug: slugSchema,
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

// ── Entrada CMS ───────────────────────────────────────────────
const cmsEntryDataSchema = z
  .record(
    z.string().max(50).regex(/^[a-zA-Z0-9_]+$/),
    z.union([
      z.string().max(10_000),
      z.number(),
      z.boolean(),
      z.null(),
    ]),
  )
  .refine(
    (obj) => Object.keys(obj).length <= 50,
    { message: "Máximo 50 campos por entrada" },
  );

export const createCmsEntrySchema = z.object({
  siteId: uuidSchema,
  collectionSlug: slugSchema,
  data: cmsEntryDataSchema,
  published: z.boolean().default(true),
});

export type CreateCmsEntryInput = z.infer<typeof createCmsEntrySchema>;

// ── Actualizar entrada CMS ────────────────────────────────────
export const updateCmsEntrySchema = z.object({
  entryId: uuidSchema,
  data: cmsEntryDataSchema.optional(),
  published: z.boolean().optional(),
});

export type UpdateCmsEntryInput = z.infer<typeof updateCmsEntrySchema>;

// ── Deploy de sitio ───────────────────────────────────────────
export const deploySiteSchema = z.object({
  siteId: uuidSchema.optional(),
  siteName: z
    .string()
    .min(1)
    .max(80)
    .transform((s) => s.replace(/\u0000/g, "").trim())
    .optional(),
  document: z.unknown(),
});

export type DeploySiteInput = z.infer<typeof deploySiteSchema>;

// ── Crear sitio ───────────────────────────────────────────────
export const createSiteSchema = z.object({
  name: safeStringSchema(80),
  subdomain: slugSchema,
});

export type CreateSiteInput = z.infer<typeof createSiteSchema>;

// ── Publicar template ─────────────────────────────────────────
export const publishTemplateSchema = z.object({
  name: safeStringSchema(200),
  category: z
    .enum(["social", "print", "branding", "general", "ai-generated"])
    .default("general"),
  isPremium: z.boolean().default(false),
  price: z.coerce.number().int().min(0).max(100_000).default(0),
  data: z.unknown(),
});

export type PublishTemplateInput = z.infer<typeof publishTemplateSchema>;

// ── Query params de CMS ───────────────────────────────────────
export const cmsQuerySchema = z.object({
  site_id: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  published: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export type CmsQueryInput = z.infer<typeof cmsQuerySchema>;