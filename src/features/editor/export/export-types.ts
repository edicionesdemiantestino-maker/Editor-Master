/**
 * Tipos del sistema de exportación (raster + PDF + extensión prensa / CMYK futura).
 */

export const EXPORT_SCALE_PRESETS = [1, 2, 3, 4] as const;
export type ExportScalePreset = (typeof EXPORT_SCALE_PRESETS)[number];

/** Formato principal elegido en el modal. */
export type ExportFormatKind = "png" | "jpeg" | "pdf-rgb" | "pdf-print";

/** Cómo se incrusta el raster en el PDF. */
export type PdfRasterEncoding = "png-lossless" | "jpeg-high";

/**
 * Estado del formulario de exportación (UI ↔ servicio).
 * Campos irrelevantes para un formato se ignoran en el servicio.
 */
export type ExportFormState = {
  format: ExportFormatKind;
  scale: ExportScalePreset;
  /** Solo PNG: si es `false`, se aplana sobre el color de fondo del documento. */
  pngPreserveTransparency: boolean;
  /** JPEG y PDF con incrustación JPEG (0.85 … 1). */
  jpegQuality: number;
  /** Solo PDF: calidad / tamaño del XObject embebido. */
  pdfRasterEncoding: PdfRasterEncoding;
  /**
   * Solo PDF impresión: sangrado en mm alrededor del cajón lógico.
   * El lienzo lógico se centra en la página ampliada.
   */
  bleedMm: number;
  /**
   * Tras el PDF RGB + JSON, solicitar al servidor un PDF CMYK real (`/api/export-print`).
   */
  requestServerCmykPdf: boolean;
  /** Marcas de corte en la zona de sangrado (solo PDF CMYK servidor). */
  drawPrintCropMarks: boolean;
};

export const DEFAULT_EXPORT_FORM: ExportFormState = {
  format: "png",
  scale: 2,
  pngPreserveTransparency: true,
  jpegQuality: 0.95,
  pdfRasterEncoding: "png-lossless",
  bleedMm: 3,
  requestServerCmykPdf: false,
  drawPrintCropMarks: false,
};

/** Límites de escala (coherentes con Fabric `multiplier`). */
export const EXPORT_MULTIPLIER_MIN = 0.5;
export const EXPORT_MULTIPLIER_MAX = 8;

/** Borde máximo del bitmap exportado (px) — evita OOM en `toDataURL` con multiplier alto. */
export const EXPORT_CLIENT_MAX_RASTER_EDGE_PX = 8192;

/** Tope de píxeles totales (ancho×alto del bitmap); coherente con presupuesto de memoria del navegador. */
export const EXPORT_CLIENT_MAX_TOTAL_PIXELS = 50_000_000;

export function clampExportMultiplier(value: number): number {
  const n = Number.isFinite(value) ? value : 1;
  return Math.min(EXPORT_MULTIPLIER_MAX, Math.max(EXPORT_MULTIPLIER_MIN, n));
}

/**
 * Ajusta el multiplier respecto al lienzo lógico para no exceder borde ni megapíxeles.
 */
export function clampExportMultiplierForCanvas(args: {
  requestedMultiplier: number;
  logicalWidthPx: number;
  logicalHeightPx: number;
}): number {
  const m0 = clampExportMultiplier(args.requestedMultiplier);
  const w = Math.max(1, Math.abs(args.logicalWidthPx));
  const h = Math.max(1, Math.abs(args.logicalHeightPx));
  const maxDim = Math.max(w, h);
  const byEdge = EXPORT_CLIENT_MAX_RASTER_EDGE_PX / maxDim;
  const byTotal = Math.sqrt(EXPORT_CLIENT_MAX_TOTAL_PIXELS / (w * h));
  return clampExportMultiplier(Math.min(m0, byEdge, byTotal));
}

/**
 * Payload versionado para un backend de prensa (CMYK, RIP, etc.).
 * El PDF generado hoy sigue siendo RGB embebido; este JSON describe intención y medidas.
 */
export type PrintJobPayloadV1 = {
  readonly schema: "editor-maestro.print-job/v1";
  readonly createdAtIso: string;
  readonly documentTitle: string;
  readonly artboardLogicalPx: { readonly width: number; readonly height: number };
  /** `multiplier` usado al rasterizar desde Fabric. */
  readonly exportScale: ExportScalePreset;
  readonly bleedMm: number;
  readonly pdfRgb: {
    readonly pageSizePt: { readonly width: number; readonly height: number };
    readonly contentBoxPt: { readonly width: number; readonly height: number };
    readonly contentOriginPt: { readonly x: number; readonly y: number };
  };
  readonly color: {
    readonly embedded: "sRGB";
    readonly requestedPipeline: "await-backend-cmyk-conversion";
  };
  readonly raster: {
    readonly encoding: "image/png" | "image/jpeg";
    readonly intrinsicPx: { readonly width: number; readonly height: number };
  };
};
