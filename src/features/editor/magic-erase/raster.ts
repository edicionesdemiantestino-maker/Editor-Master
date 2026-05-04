import type { ImageElement } from "@/entities/editor/document-schema";

import type { InpaintImagePixelROI } from "@/services/inpaint/inpaint-types";

export function buildBinaryMaskPngDataUrl(
  width: number,
  height: number,
  roi: InpaintImagePixelROI,
): string {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D context no disponible");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(roi.x, roi.y, roi.w, roi.h);
  return c.toDataURL("image/png");
}

/** Rasteriza `element.src` al tamaño natural del modelo (una salida PNG). */
export function rasterizeImageElementToPngDataUrl(
  el: ImageElement,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = el.naturalWidth;
      const h = el.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        reject(new Error("2D context no disponible"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen del elemento"));
    img.src = el.src;
  });
}

/**
 * URLs de entrega Replicate pasan por `/api/image-proxy` (cookies + allowlist)
 * para evitar CORS y no exponer descargas anónimas cross-origin.
 */
async function describeImageFetchFailure(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const j = (await res.json()) as { error?: string };
      switch (j.error) {
        case "unauthorized":
          return "Tenés que iniciar sesión para cargar la imagen del resultado.";
        case "rate_limit":
          return "Demasiadas descargas de imágenes. Esperá unos segundos.";
        case "too_many_concurrent_requests":
          return "Hay demasiadas descargas en paralelo. Esperá a que terminen.";
        case "upstream_timeout":
        case "upstream_error":
        case "upstream_fetch_failed":
          return "No se pudo obtener la imagen desde el proveedor. Reintentá.";
        case "upstream_too_large":
          return "La imagen devuelta es demasiado grande.";
        case "forbidden_host":
          return "URL de imagen no permitida.";
        default:
          break;
      }
    } catch {
      /* ignorar JSON inválido */
    }
  }
  return `Descarga fallida (${res.status})`;
}

export function resolveImageFetchUrlForClient(url: string): {
  url: string;
  credentials: RequestCredentials;
} {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h === "replicate.delivery" || h.endsWith(".replicate.delivery")) {
      return {
        url: `/api/image-proxy?url=${encodeURIComponent(url)}`,
        credentials: "include",
      };
    }
  } catch {
    /* URL inválida: fetch fallará con mensaje claro */
  }
  return { url, credentials: "omit" };
}

export async function fetchHttpsToPngDataUrl(url: string): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const { url: target, credentials } = resolveImageFetchUrlForClient(url);
  const res = await fetch(target, { credentials });
  if (!res.ok) {
    const msg = await describeImageFetchFailure(res);
    throw new Error(msg);
  }
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const width = bmp.width;
  const height = bmp.height;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D context no disponible");
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return {
    dataUrl: c.toDataURL("image/png"),
    width,
    height,
  };
}
