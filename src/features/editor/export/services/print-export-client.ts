export type RequestPrintCmykPdfArgs = {
  imageDataUrl: string;
  bleedMm: number;
  title: string;
  drawCropMarks: boolean;
  /** DPI lógico para mapear píxeles → puntos PDF (72–600). */
  targetDpi?: number;
};

export type RequestPrintCmykPdfResult = {
  blob: Blob;
  filename: string;
};

function messageForError(code: string | undefined, status: number): string {
  switch (code) {
    case "unauthorized":
      return "Iniciá sesión para generar el PDF CMYK.";
    case "rate_limit":
      return "Demasiadas solicitudes de impresión CMYK. Esperá un momento.";
    case "too_many_concurrent_requests":
      return "Ya hay una exportación CMYK en curso.";
    case "payload_too_large":
      return "La imagen es demasiado grande para el servidor.";
    case "dimensions_exceed_limit":
      return "La imagen supera el tamaño máximo permitido.";
    case "raster_too_many_pixels":
      return "Resolución demasiado alta; probá con menor escala de exportación.";
    case "cmyk_export_failed":
      return "El servidor no pudo generar el PDF CMYK.";
    default:
      return `Error del servidor (${status}).`;
  }
}

/**
 * POST a `/api/export-print` y devuelve el PDF CMYK como Blob.
 */
export async function requestPrintCmykPdfDownload(
  args: RequestPrintCmykPdfArgs,
): Promise<RequestPrintCmykPdfResult> {
  const body = JSON.stringify({
    imageDataUrl: args.imageDataUrl,
    bleedMm: args.bleedMm,
    title: args.title,
    drawCropMarks: args.drawCropMarks,
    targetDpi: args.targetDpi ?? 300,
  });
  const res = await fetch("/api/export-print", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const cd = res.headers.get("Content-Disposition");
  const filenameMatch = cd?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? "print-cmyk.pdf";

  if (!res.ok) {
    let code: string | undefined;
    try {
      const j = (await res.json()) as { error?: string };
      code = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(messageForError(code, res.status));
  }

  const blob = await res.blob();
  return { blob, filename };
}
