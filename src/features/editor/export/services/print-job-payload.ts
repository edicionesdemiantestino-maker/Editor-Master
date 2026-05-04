import type { EditorDocument } from "@/entities/editor/document-schema";

import type { ExportScalePreset, PrintJobPayloadV1 } from "../export-types";

export function buildPrintJobPayloadV1(args: {
  document: EditorDocument;
  scale: ExportScalePreset;
  bleedMm: number;
  pageSizePt: { width: number; height: number };
  contentBoxPt: { width: number; height: number };
  contentOriginPt: { x: number; y: number };
  rasterEncoding: "image/png" | "image/jpeg";
  intrinsicPx: { width: number; height: number };
}): PrintJobPayloadV1 {
  return {
    schema: "editor-maestro.print-job/v1",
    createdAtIso: new Date().toISOString(),
    documentTitle: args.document.meta.title,
    artboardLogicalPx: {
      width: args.document.canvas.width,
      height: args.document.canvas.height,
    },
    exportScale: args.scale,
    bleedMm: args.bleedMm,
    pdfRgb: {
      pageSizePt: args.pageSizePt,
      contentBoxPt: args.contentBoxPt,
      contentOriginPt: args.contentOriginPt,
    },
    color: {
      embedded: "sRGB",
      requestedPipeline: "await-backend-cmyk-conversion",
    },
    raster: {
      encoding: args.rasterEncoding,
      intrinsicPx: args.intrinsicPx,
    },
  };
}
