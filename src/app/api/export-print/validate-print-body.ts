import { imageSize } from "image-size";

import {
  EXPORT_PRINT_MAX_EDGE_PX,
  EXPORT_PRINT_TARGET_DPI_MAX,
  EXPORT_PRINT_TARGET_DPI_MIN,
} from "./constants";
import { decodeBase64DataUrlToBuffer } from "@/lib/api/data-url";

export type ExportPrintValidated = {
  imageDataUrl: string;
  bleedMm: number;
  title: string;
  drawCropMarks: boolean;
  targetDpi: number;
};

export type ExportPrintValidationFailure = {
  ok: false;
  httpStatus: number;
  publicCode: string;
};

export type ExportPrintValidationResult =
  | { ok: true; value: ExportPrintValidated; rasterBuffer: Buffer }
  | ExportPrintValidationFailure;

const ALLOWED_PREFIXES = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
] as const;

function isAllowedDataUrl(v: unknown): v is string {
  return (
    typeof v === "string" &&
    ALLOWED_PREFIXES.some((p) => v.startsWith(p)) &&
    v.length > 80
  );
}

function decodeBase64FromDataUrl(dataUrl: string): Buffer {
  return decodeBase64DataUrlToBuffer(dataUrl, {
    // Deja margen para JSON + headers; el body total está limitado en route.ts.
    maxDecodedBytes: 24 * 1024 * 1024,
  });
}

export function validateExportPrintBody(body: unknown): ExportPrintValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, httpStatus: 400, publicCode: "invalid_json_shape" };
  }
  const o = body as Record<string, unknown>;
  if (!isAllowedDataUrl(o.imageDataUrl)) {
    return { ok: false, httpStatus: 400, publicCode: "invalid_image_data_url" };
  }
  const bleedMm = Number(o.bleedMm);
  if (!Number.isFinite(bleedMm) || bleedMm < 0 || bleedMm > 20) {
    return { ok: false, httpStatus: 400, publicCode: "invalid_bleed_mm" };
  }
  const title =
    typeof o.title === "string" ? o.title.replace(/\u0000/g, "").trim().slice(0, 200) : "";
  const drawCropMarks = o.drawCropMarks === true;
  let targetDpi = Number(o.targetDpi ?? 300);
  if (!Number.isFinite(targetDpi)) targetDpi = 300;
  targetDpi = Math.round(
    Math.min(
      EXPORT_PRINT_TARGET_DPI_MAX,
      Math.max(EXPORT_PRINT_TARGET_DPI_MIN, targetDpi),
    ),
  );

  let rasterBuffer: Buffer;
  try {
    rasterBuffer = decodeBase64FromDataUrl(o.imageDataUrl);
    const dim = imageSize(rasterBuffer);
    if (!dim.width || !dim.height) {
      return { ok: false, httpStatus: 400, publicCode: "invalid_image_binary" };
    }
    if (dim.width > EXPORT_PRINT_MAX_EDGE_PX || dim.height > EXPORT_PRINT_MAX_EDGE_PX) {
      return { ok: false, httpStatus: 400, publicCode: "dimensions_exceed_limit" };
    }
    const mp = dim.width * dim.height;
    if (mp > 120_000_000) {
      return { ok: false, httpStatus: 400, publicCode: "raster_too_many_pixels" };
    }
  } catch (e) {
    const code = e instanceof Error ? e.message : "invalid_image";
    const map: Record<string, { status: number; public: string }> = {
      invalid_data_url: { status: 400, public: "invalid_image_data_url" },
      invalid_base64: { status: 400, public: "invalid_image_data_url" },
      empty_payload: { status: 400, public: "empty_image_payload" },
      payload_too_large: { status: 413, public: "payload_too_large" },
      invalid_image: { status: 400, public: "invalid_image_binary" },
    };
    const m = map[code] ?? { status: 400, public: "invalid_image_binary" };
    return { ok: false, httpStatus: m.status, publicCode: m.public };
  }

  return {
    ok: true,
    rasterBuffer,
    value: {
      imageDataUrl: o.imageDataUrl,
      bleedMm,
      title: title.length > 0 ? title : "export-print",
      drawCropMarks,
      targetDpi,
    },
  };
}

export function rasterPxToContentPt(
  pxW: number,
  pxH: number,
  dpi: number,
): { widthPt: number; heightPt: number } {
  return {
    widthPt: (pxW * 72) / dpi,
    heightPt: (pxH * 72) / dpi,
  };
}
