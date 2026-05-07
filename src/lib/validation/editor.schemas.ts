import { z } from "zod";
import { uuidSchema, hexColorSchema, imageDataUrlSchema } from "./common.schemas";

// ── Transform ─────────────────────────────────────────────────
const transformSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite().default(0),
  scaleX: z.number().finite().default(1),
  scaleY: z.number().finite().default(1),
  originX: z.enum(["left", "center", "right"]).default("left"),
  originY: z.enum(["top", "center", "bottom"]).default("top"),
});

// ── Elemento base ─────────────────────────────────────────────
const baseElementSchema = z.object({
  id: z.string().min(1).max(100),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  opacity: z.number().min(0).max(1).default(1),
  transform: transformSchema,
});

// ── Elemento de texto ─────────────────────────────────────────
const textElementSchema = baseElementSchema.extend({
  type: z.literal("text"),
  text: z.string().max(10_000).transform((s) => s.replace(/\u0000/g, "")),
  fontSource: z.enum(["google", "system"]).default("system"),
  fontFamily: z.string().min(1).max(200),
  fontSize: z.number().min(1).max(1000),
  fontWeight: z.union([z.number(), z.string()]).default(400),
  fill: z.string().max(50).default("#000000"),
  textAlign: z
    .enum(["left", "center", "right", "justify"])
    .default("left"),
  lineHeight: z.number().min(0.5).max(5).default(1.2),
  letterSpacing: z.number().finite().default(0),
  width: z.number().positive().optional(),
});

// ── Elemento de imagen ────────────────────────────────────────
const imageElementSchema = baseElementSchema.extend({
  type: z.literal("image"),
  src: z.string().min(1).max(500_000),
  naturalWidth: z.number().int().positive(),
  naturalHeight: z.number().int().positive(),
  lockAspectRatio: z.boolean().default(true),
  effects: z
    .object({
      version: z.literal(1),
      pipeline: z.array(z.unknown()).default([]),
    })
    .default({ version: 1, pipeline: [] }),
  crop: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

export const canvasElementSchema = z.discriminatedUnion("type", [
  textElementSchema,
  imageElementSchema,
]);

// ── Canvas ────────────────────────────────────────────────────
export const editorCanvasSchema = z.object({
  width: z.number().int().min(1).max(20_000),
  height: z.number().int().min(1).max(20_000),
  backgroundColor: z.string().max(50).default("#ffffff"),
  elements: z
    .array(canvasElementSchema)
    .max(500, { message: "Máximo 500 elementos por canvas" }),
});

// ── Documento del editor ──────────────────────────────────────
export const editorDocumentSchema = z.object({
  version: z.literal(1),
  projectId: z.string().min(1).max(100),
  canvas: editorCanvasSchema,
  meta: z.object({
    title: z
      .string()
      .max(200)
      .default("Sin título")
      .transform((s) => s.replace(/\u0000/g, "").trim()),
    updatedAt: z.string().datetime().optional(),
  }),
});

export type EditorDocument = z.infer<typeof editorDocumentSchema>;

// ── Crear proyecto ────────────────────────────────────────────
export const createProjectSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .default("Sin título")
    .transform((s) => s.replace(/\u0000/g, "").trim()),
  workspaceId: uuidSchema.optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// ── Guardar proyecto ──────────────────────────────────────────
export const saveProjectSchema = z.object({
  projectId: uuidSchema,
  document: editorDocumentSchema,
});

export type SaveProjectInput = z.infer<typeof saveProjectSchema>;

// ── Configuración de exportación ──────────────────────────────
export const exportSettingsSchema = z.object({
  format: z.enum(["png", "jpeg", "pdf-rgb", "pdf-print"]),
  scale: z.number().min(0.5).max(8).default(2),
  pngPreserveTransparency: z.boolean().default(true),
  jpegQuality: z.number().min(0.05).max(1).default(0.95),
  pdfRasterEncoding: z
    .enum(["png-lossless", "jpeg-high"])
    .default("png-lossless"),
  bleedMm: z.number().min(0).max(20).default(3),
  requestServerCmykPdf: z.boolean().default(false),
  drawPrintCropMarks: z.boolean().default(false),
});

export type ExportSettings = z.infer<typeof exportSettingsSchema>;

// ── Inpaint (magic erase) ─────────────────────────────────────
export const inpaintSchema = z.object({
  imageDataUrl: imageDataUrlSchema,
  maskDataUrl: imageDataUrlSchema,
  prompt: z
    .string()
    .max(2000)
    .optional()
    .transform((s) => s?.replace(/\u0000/g, "").trim() || undefined),
});

export type InpaintInput = z.infer<typeof inpaintSchema>;