export type InpaintApiRequestBody = {
  imageDataUrl: string;
  maskDataUrl: string;
  prompt?: string;
};

export type InpaintApiResponseBody = {
  outputUrl: string;
  requestId?: string;
};

function humanMessageForCode(code: string | undefined, status: number): string {
  switch (code) {
    case "unauthorized":
      return "Tenés que iniciar sesión para usar el borrador mágico.";
    case "rate_limit":
      return "Demasiadas solicitudes. Probá de nuevo en unos segundos.";
    case "too_many_concurrent_requests":
      return "Ya hay un inpainting en curso. Esperá a que termine.";
    case "payload_too_large":
      return "Las imágenes son demasiado grandes para el servidor (límite de cuerpo).";
    case "content_length_required":
      return "El cliente no envió Content-Length; actualizá la app o contactá soporte.";
    case "dimensions_exceed_limit":
      return "La imagen supera el tamaño máximo permitido (2048 px por lado).";
    case "image_mask_dimension_mismatch":
      return "Imagen y máscara deben tener el mismo tamaño en píxeles.";
    case "provider_unavailable":
      return "El proveedor de IA no está disponible. Reintentá más tarde.";
    case "inpaint_not_configured":
      return "El servidor no tiene configurado Replicate.";
    case "auth_backend_unavailable":
    case "auth_backend_error":
      return "Autenticación no disponible en el servidor.";
    case "invalid_json":
      return "El servidor no pudo interpretar la solicitud.";
    case "upstream_timeout":
      return "La descarga de la imagen tardó demasiado. Reintentá.";
    default:
      return status === 429
        ? "Límite de uso alcanzado."
        : `Error del servidor (${status}).`;
  }
}

export async function requestInpaintFromApi(
  body: InpaintApiRequestBody,
): Promise<InpaintApiResponseBody> {
  const payload = JSON.stringify(body);
  const res = await fetch("/api/inpaint", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  const json = (await res.json()) as InpaintApiResponseBody & {
    error?: string;
    requestId?: string;
    retryAfterMs?: number;
  };
  if (!res.ok) {
    const msg = humanMessageForCode(json.error, res.status);
    throw new Error(msg);
  }
  if (!json.outputUrl) {
    throw new Error("Respuesta sin outputUrl");
  }
  return json;
}
