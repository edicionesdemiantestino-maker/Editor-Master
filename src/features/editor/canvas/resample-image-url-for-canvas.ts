import { FABRIC_IMAGE_MAX_DISPLAY_EDGE_PX } from "./image-max-edge";

/**
 * Si la imagen remota supera el borde máximo, devuelve un data URL PNG remuestreado
 * para reducir memoria GPU y tiempo de `toDataURL` en exportación.
 * Falla en silencio hacia `originalUrl` si fetch/CORS no permite leer píxeles.
 */
export async function resampleImageUrlForCanvasIfNeeded(
  originalUrl: string,
  naturalWidth: number,
  naturalHeight: number,
  maxEdge: number = FABRIC_IMAGE_MAX_DISPLAY_EDGE_PX,
): Promise<string> {
  if (
    naturalWidth <= 0 ||
    naturalHeight <= 0 ||
    (naturalWidth <= maxEdge && naturalHeight <= maxEdge)
  ) {
    return originalUrl;
  }
  try {
    const res = await fetch(originalUrl, { mode: "cors", credentials: "omit" });
    if (!res.ok) return originalUrl;
    const blob = await res.blob();
    const scale = Math.min(
      maxEdge / naturalWidth,
      maxEdge / naturalHeight,
      1,
    );
    const tw = Math.max(1, Math.round(naturalWidth * scale));
    const th = Math.max(1, Math.round(naturalHeight * scale));
    const bmp = await createImageBitmap(blob, {
      resizeWidth: tw,
      resizeHeight: th,
      resizeQuality: "high",
    });
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const ctx = c.getContext("2d");
    if (!ctx) {
      bmp.close();
      return originalUrl;
    }
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    return c.toDataURL("image/png");
  } catch {
    return originalUrl;
  }
}
