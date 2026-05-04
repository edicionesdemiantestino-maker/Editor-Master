import type { Canvas } from "fabric";

import {
  clampExportMultiplier,
  clampExportMultiplierForCanvas,
} from "../export-types";

export type FabricRasterCaptureFormat = "png" | "jpeg";

export type FabricRasterCaptureOptions = {
  canvas: Canvas;
  multiplier: number;
  format: FabricRasterCaptureFormat;
  /** Solo JPEG. */
  jpegQuality?: number;
  /** Si se pasan, el multiplier se recorta por borde y megapíxeles máximos. */
  logicalWidthPx?: number;
  logicalHeightPx?: number;
};

/**
 * Captura el lienzo con `toDataURL` y `multiplier` (alta resolución).
 * Debe ejecutarse dentro de {@link withFabricExportSession} para un frame limpio.
 */
export function captureFabricRasterDataUrl(options: FabricRasterCaptureOptions): string {
  let m = clampExportMultiplier(options.multiplier);
  if (
    options.logicalWidthPx != null &&
    options.logicalHeightPx != null
  ) {
    m = clampExportMultiplierForCanvas({
      requestedMultiplier: m,
      logicalWidthPx: options.logicalWidthPx,
      logicalHeightPx: options.logicalHeightPx,
    });
  }
  options.canvas.renderAll();

  if (options.format === "jpeg") {
    const q = options.jpegQuality ?? 0.92;
    return options.canvas.toDataURL({
      format: "jpeg",
      multiplier: m,
      quality: Math.min(1, Math.max(0.05, q)),
    });
  }

  return options.canvas.toDataURL({
    format: "png",
    multiplier: m,
  });
}

export async function readRasterDataUrlSize(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  const img = await loadImage(dataUrl);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar el raster para aplanar."));
    img.src = src;
  });
}

/**
 * Convierte PNG con alpha en PNG opaco sobre un color sólido (simula “sin transparencia”).
 */
export async function flattenPngDataUrlOnBackground(
  pngDataUrl: string,
  backgroundCss: string,
): Promise<string> {
  const img = await loadImage(pngDataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo crear contexto 2D para aplanar PNG.");
  }
  ctx.fillStyle = backgroundCss;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);
  return c.toDataURL("image/png");
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("Data URL inválida.");
  }
  const meta = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  if (!meta.startsWith("data:") || !base64) {
    throw new Error("Data URL inválida.");
  }
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}
